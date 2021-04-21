import { ActivityGain } from './ActivityGain';
import { ItemGain } from './ItemGain';
import { v1 as uuidv1 } from 'uuid';

export class ConditionGain {
    public readonly _className: string = this.constructor.name;
    public addValue: number = 0;
    public id = uuidv1();
    public apply: boolean = true;
    public decreasingValue: boolean = false;
    //Duration in turns * 10, or:
    // - -5 for automatic - the duration will be determined by choice and level (for spells).
    // - -1 for permanent
    // - -2 for until rest
    // - -3 for until refocus
    // - 1 for instant - will need to be resolved and removed manually before time can pass
    // - 0 for no duration - will be processed and then immediately removed, useful for instant effects and chaining conditions
    public duration: number = -1;
    public maxDuration: number = -1;
    //nextStage in turns * 10
    public nextStage: number = 0;
    public name: string = "";
    public showChoices: boolean = false;
    public showNotes: boolean = false;
    public showDuration: boolean = false;
    public showValue: boolean = false;
    public showRadius: boolean = false;
    public notes: string = "";
    public source: string = "";
    public parentID: string = "";
    public value: number = 0;
    //Remove this condition if any of the endsWithConditions is removed.
    public endsWithConditions: string[] = [];
    //Only activate this condition if this string evaluates to a numeral nonzero value. This is tested at the add_condition stage, so it can be combined with conditionChoiceFilter.
    public activationPrerequisite: string = "";
    //For conditions within conditions, activate this condition only if this choice was made on the original condition.
    public conditionChoiceFilter: string = "";
    //Spells choose from multiple conditions those that match their level.
    //For example, if a spell has a ConditionGain with heightenedFilter 1 and one with heightenedFilter 2, and the spell is cast at 2nd level, only the heightenedFilter 2 ConditionGain is used.
    public heightenedFilter: number = 0;
    //When casting a spell, the spell level is inserted here so it can be used for calculations.
    public heightened: number = 0;
    //When casting a spell, a different radius for a condition may be wanted.
    public radius: number = 0;
    //When casting a spell, some conditions want to calculate the spellcasting modifier, so we copy the spellcasting ability.
    public spellCastingAbility: string = "";
    //Some conditions change depending on how the spell was cast (particularly if they were cast as an Innate spell), so we copy the spell's source.
    public spellSource: string = "";
    //Save the id of the spellGain so that the spellgain can be deactivated when the condition ends.
    public spellGainID: string = "";
    //A condition's gainActivities gets copied here to track.
    public gainActivities: ActivityGain[] = [];
    //A condition's gainItems gets copied here to track.
    public gainItems: ItemGain[] = [];
    //If the gain is persistent, it does not get removed when its source is deactivated.
    public persistent: boolean = false;
    //If the gain is ignorePersistent, it gets removed when its source is deactivated, even when the condition is usually persistent.
    public ignorePersistent: boolean = false;
    //If the gain is ignorePersistentAtChoiceChange, it gets removed when the parent condition changes choices, even when it is persistent.
    public ignorePersistentAtChoiceChange: boolean = false;
    //For conditions gained by conditions, if lockedByParent is set, this condition cannot be removed until the condition with the source ID is gone.
    public lockedByParent: boolean = false;
    //If valueLockedByParent is set, the condition value can't be changed while the parent condition exists.
    public valueLockedByParent: boolean = false;
    //For spells, designate if the condition is meant for the caster or "" for the normal target creature.
    public targetFilter: string = "";
    //Some conditions have a choice that you can make. That is stored in this value.
    public choice: string = "";
    //If there is a choiceBySubType value, and you have a feat with superType == choiceBySubType, the choice will be set to the subtype of that feat. This overrides any manual choice.
    public choiceBySubType: string = "";
    //If choiceLocked is true, the choice can't be changed manually.
    public choiceLocked: boolean = false;
    //If hideChoices is true, the choice isn't visible on activities or spells.
    public hideChoices: boolean = false;
    //If acknowledgedInputRequired is true, the inputRequired message is not shown.
    public acknowledgedInputRequired: boolean = false;
}