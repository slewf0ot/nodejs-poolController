﻿import * as extend from 'extend';
import { EventEmitter } from 'events';
import {SystemBoard, byteValueMap, ConfigQueue, ConfigRequest, BodyCommands, PumpCommands, SystemCommands, CircuitCommands, FeatureCommands, ChlorinatorCommands, EquipmentIdRange} from './SystemBoard';
import {logger} from '../../logger/Logger';
import { EasyTouchBoard, TouchConfigQueue, GetTouchConfigCategories } from './EasyTouchBoard';
import {state, ChlorinatorState} from '../State';
import { PoolSystem, Body, Pump, sys, CircuitGroupCircuit, CircuitGroup } from '../Equipment';
import { Protocol, Outbound, Message, Response } from '../comms/messages/Messages';

import {conn} from '../comms/Comms';
export class IntelliTouchBoard extends EasyTouchBoard {
    constructor (system: PoolSystem){
        super(system);
        this.equipmentIds.features.start = 40;
        this.equipmentIds.features.end = 50;
        this._configQueue = new ITTouchConfigQueue();
    }
    public features: TouchFeatureCommands=new TouchFeatureCommands(this);
}
class ITTouchConfigQueue extends TouchConfigQueue {
    public queueChanges() {
        this.reset();
        if (conn.mockPort) {
            logger.info(`Skipping configuration request from OCP because MockPort enabled.`);
        } else {
            logger.info(`Requesting ${sys.controllerType} configuration`);
            this.queueItems(GetTouchConfigCategories.dateTime, [0]);
            this.queueItems(GetTouchConfigCategories.heatTemperature, [0]);
            this.queueItems(GetTouchConfigCategories.solarHeatPump, [0]);
            this.queueRange(GetTouchConfigCategories.customNames, 0, sys.equipment.maxCustomNames - 1);
            this.queueRange(GetTouchConfigCategories.circuits, 1, sys.equipment.maxCircuits); // circuits
            this.queueRange(GetTouchConfigCategories.circuits, 41, 41 + sys.equipment.maxFeatures); // features
            this.queueRange(GetTouchConfigCategories.schedules, 1, sys.equipment.maxSchedules);
            this.queueItems(GetTouchConfigCategories.delays, [0]);
            this.queueItems(GetTouchConfigCategories.settings, [0]);
            this.queueItems(GetTouchConfigCategories.intellifloSpaSideRemotes, [0]);
            this.queueItems(GetTouchConfigCategories.is4is10, [0]);
            this.queueItems(GetTouchConfigCategories.spaSideRemote, [0]);
            this.queueItems(GetTouchConfigCategories.valves, [0]);
            this.queueItems(GetTouchConfigCategories.lightGroupPositions);
            this.queueItems(GetTouchConfigCategories.highSpeedCircuits, [0]);
            this.queueRange(GetTouchConfigCategories.pumpConfig, 1, sys.equipment.maxPumps);
            this.queueRange(GetTouchConfigCategories.circuitGroups, 0, sys.equipment.maxFeatures - 1);
            // items not required by ScreenLogic
            if (sys.chlorinators.getItemById(1).isActive)
                this.queueItems(GetTouchConfigCategories.intellichlor, [0]);
        }
        if (this.remainingItems > 0) {
            var self = this;
            setTimeout(() => {self.processNext();}, 50);
        } else state.status = 1;
        state.emitControllerChange();
    }
}
// TODO: is this needed?  Should be in EasyTouch and not overridden here?
class TouchFeatureCommands extends FeatureCommands {
    public syncGroupStates() {
        let arr = sys.circuitGroups.toArray();
        for (let i = 0; i < arr.length; i++) {
            let grp: CircuitGroup = arr[i];
            let circuits = grp.circuits.toArray();
            let bIsOn = true;
            if (grp.isActive) {
                for (let j = 0; j < circuits.length; j++) {
                    let circuit: CircuitGroupCircuit = circuits[j];
                    let cstate = state.circuits.getInterfaceById(circuit.circuit);
                    if (cstate.isOn !== circuit.desiredStateOn ) bIsOn = false;
                }
            }
            let sgrp = state.circuitGroups.getItemById(grp.id);
            sgrp.isOn = bIsOn && grp.isActive;
            state.emitEquipmentChanges();
        }
    }

}