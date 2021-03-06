﻿import { Inbound } from "../Messages";
import { sys } from "../../../Equipment";
import { ControllerType } from "../../../Constants";
export class OptionsMessage {
    public static process(msg: Inbound): void {
        switch (sys.controllerType) {
            case ControllerType.IntelliCenter:
                OptionsMessage.processIntelliCenter(msg);
                break;
            case ControllerType.IntelliCom:
            case ControllerType.EasyTouch:
            case ControllerType.IntelliTouch:
                OptionsMessage.processIntelliTouch(msg);
                break;
        }
    }
    private static processIntelliCenter(msg: Inbound) {
        switch (msg.action) {
            case 30:
                switch (msg.extractPayloadByte(1)) {
                    case 0:
                        {
                            sys.general.options.clockSource = (msg.extractPayloadByte(13) & 32) === 32 ? 'internet' : 'manual';

                            sys.general.options.clockMode = (msg.extractPayloadByte(13) & 64) === 64 ? 24 : 12;
                            sys.general.options.adjustDST = (msg.extractPayloadByte(13) & 128) === 128;
                            sys.general.options.pumpDelay = msg.extractPayloadByte(29) === 1;
                            sys.general.options.cooldownDelay = msg.extractPayloadByte(37) === 1;
                            sys.general.options.manualPriority = msg.extractPayloadByte(38) === 1;
                            sys.general.options.manualHeat = msg.extractPayloadByte(39) === 1;
                            sys.general.options.waterTempAdj2 = (msg.extractPayloadByte(2) & 0x007F) * (((msg.extractPayloadByte(2) & 0x0080) > 0) ? -1 : 1);
                            sys.general.options.waterTempAdj1 = (msg.extractPayloadByte(3) & 0x007F) * (((msg.extractPayloadByte(3) & 0x0080) > 0) ? -1 : 1);
                            sys.general.options.solarTempAdj1 = (msg.extractPayloadByte(4) & 0x007F) * (((msg.extractPayloadByte(4) & 0x0080) > 0) ? -1 : 1);
                            sys.general.options.airTempAdj = (msg.extractPayloadByte(5) & 0x007F) * (((msg.extractPayloadByte(5) & 0x0080) > 0) ? -1 : 1);
                            sys.general.options.waterTempAdj2 = (msg.extractPayloadByte(6) & 0x007F) * (((msg.extractPayloadByte(6) & 0x0080) > 0) ? -1 : 1);
                            let body = sys.bodies.getItemById(1, sys.equipment.maxBodies > 0);
                            body.heatMode = msg.extractPayloadByte(24);
                            body.setPoint = msg.extractPayloadByte(20);
                            body = sys.bodies.getItemById(2, sys.equipment.maxBodies > 1);
                            body.heatMode = msg.extractPayloadByte(25);
                            body.setPoint = msg.extractPayloadByte(22);
                            body = sys.bodies.getItemById(3, sys.equipment.maxBodies > 2);
                            body.heatMode = msg.extractPayloadByte(26);
                            body.setPoint = msg.extractPayloadByte(21);
                            body.manualHeat = sys.general.options.manualHeat;
                            body = sys.bodies.getItemById(4, sys.equipment.maxBodies > 3);
                            body.heatMode = msg.extractPayloadByte(27);
                            body.setPoint = msg.extractPayloadByte(23);
                            break;
                        }
                    case 1: // Unknown
                        break;
                }
                break;
        }
    }
    private static processIntelliTouch(msg: Inbound) {
        switch (msg.action) {
            case 30: {
                // sample packet
                // [165,33,15,16,30,16],[4,9,16,0,1,72,0,0,16,205,0,0,0,2,0,0],[2,88]
                // this is (I believe) to assign circuits that require high speed mode with a dual speed pump

                // We don't want the dual speed pump to even exist unless there are no circuit controlling it.
                // It should not be showing up in our pumps list or emitting state unless the user has defined
                // circuits to it on *Touch interfaces.
                let arrCircuits = [];
                let pump = sys.pumps.getDualSpeed(true);
                for (let i = 0; i <= 3; i++) {
                    let val = msg.extractPayloadByte(i);
                    if (val > 0) arrCircuits.push(val);
                    else pump.circuits.removeItemById(i);
                }
                if (arrCircuits.length > 0) {
                    let pump = sys.pumps.getDualSpeed(true);
                    for (let j = 1; j <= arrCircuits.length; j++) pump.circuits.getItemById(j, true).circuit = arrCircuits[j];
                }
                else sys.pumps.removeItemById(10);
                break;
            }
            case 40:
                // [165,33,16,34,168,10],[0,0,0,254,0,0,0,0,0,0],[2,168 = manual heat mode off
                // [165,33,16,34,168,10],[0,0,0,254,1,0,0,0,0,0],[2,169] = manual heat mode on
                sys.general.options.manualHeat = msg.extractPayloadByte(4) === 1;
                break;
        }
    }
}