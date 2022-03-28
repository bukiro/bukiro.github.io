import { Item } from 'src/app/classes/Item';
import { Hint } from 'src/app/classes/Hint';
import { Creature } from 'src/app/classes/Creature';
import { EffectGain } from 'src/app/classes/EffectGain';
import { Effect } from 'src/app/classes/Effect';
import { ActivityGain } from './ActivityGain';

export class Trait {
    public desc: string = "";
    //effectDesc describes how to use the trait's effects, if needed. Typically something like "Activate the first level for X and the second for Y".
    public effectDesc: string = "";
    public dynamic: boolean = false;
    public dynamicDefault: number = 6;
    //Name any common activity that becomes available when you equip and invest an item with this trait.
    public gainActivities: ActivityGain[] = [];
    public name: string = "";
    public hints: Hint[] = [];
    //Object effects apply only to the object that is bearing this trait, and are evaluated within the object instead of the effects service.
    // Whether they are activated or not is saved in the object and accessed with 'active' in calculations.
    public objectEffects: EffectGain[] = [];
    //If extraActivations is 1 through 4, up to four more activation boxes are shown to control the object effects.
    // Their state can be accessed with 'active2' through 'active5' in calculations.
    public extraActivations: number = 0;
    public sourceBook: string = "";
    recast() {
        this.gainActivities = this.gainActivities.map(obj => Object.assign(new ActivityGain(), obj).recast());
        this.hints = this.hints.map(obj => Object.assign(new Hint(), obj).recast());
        this.objectEffects = this.objectEffects.map(obj => Object.assign(new EffectGain(), obj).recast());
        return this;
    }
    //Return all equipped items that have this trait, or alternatively only their names.
    //Some trait instances have information after the trait name, so we allow traits that include this trait's name as long as this trait is dynamic.
    haveOn(creature: Creature, namesOnly: boolean = false) {
        let filteredItems: Item[] = []
        creature.inventories.forEach(inventory => {
            filteredItems.push(...inventory.allEquipment()
                .filter(item =>
                    item.equipped &&
                    item._traits
                        .find(trait =>
                            this.name == trait ||
                            (
                                trait.includes(this.name) &&
                                this.dynamic
                            )
                        )
                )
            );
        });
        if (namesOnly) {
            return filteredItems.map(item => item.displayName || item.name);
        } else {
            return filteredItems;
        }
    };
    get_ObjectEffects(activation: { trait: string, active: boolean, active2: boolean, active3: boolean }, filter: string[] = []) {
        //Collect all object effect gains of this hint that match the filter, and generate effects from them. This uses a similar process to EvaluationService.get_ValueFromFormula, but with very reduced options.
        //Only active, active2, active3 and dynamicValue are available as variables, and no toggle or title effects will be produced. The resulting effects are very minimized, as only their value and setValue are required.
        if (this.objectEffects) {
            let effects = this.objectEffects.filter(effect => !filter.length || filter.includes(effect.affected));
            if (effects.length) {
                let resultingEffects: Effect[] = [];
                let active = activation.active;
                let active2 = activation.active2;
                let active3 = activation.active3;
                let dynamicValue = this.get_DynamicValue(activation.trait);
                effects.forEach(effect => {
                    let show: boolean = effect.show;
                    let type: string = "untyped";
                    let penalty: boolean = false;
                    let value: string = "0";
                    let setValue: string = "";
                    try {
                        value = eval(effect.value).toString();
                        if (parseInt(value) > 0) {
                            value = "+" + value;
                        }
                    } catch (error) {
                        value = "0";
                    };
                    if (effect.setValue) {
                        try {
                            setValue = eval(effect.setValue).toString();
                        } catch (error) {
                            setValue = "";
                        };
                    }
                    if ((!parseInt(value) && !parseFloat(value)) || parseFloat(value) == Infinity) {
                        value = "0";
                    }
                    if (effect.type) {
                        type = effect.type;
                    }
                    if (setValue) {
                        penalty = false;
                        value = "0";
                    } else {
                        penalty = (parseInt(value) < 0) == (effect.affected != "Bulk");
                    }
                    //Effects can affect another creature. In that case, remove the notation and change the target.
                    let target: string = "";
                    let affected: string = effect.affected;
                    //Effects that have no value get ignored.
                    if (setValue || parseInt(value) != 0) {
                        resultingEffects.push(Object.assign(new Effect(value), { creature: target, type: type, target: affected, setValue: setValue, toggle: false, source: "conditional, " + this.name, penalty: penalty, show: show }));
                    }
                })
                return resultingEffects;
            }
        }
        return [];
    }
    get_DynamicValue(traitName: string) {
        //Return the value of a dynamic trait, reduced to only the first number.
        if (this.dynamic && traitName != this.name) {
            let value = traitName.replace(this.name, "").match(/(\d+)/)[0];
            if (value && !isNaN(parseInt(value))) {
                return value;
            }
        } else if (this.dynamic && traitName == this.name) {
            //If the dynamic trait has no value, return the default.
            return this.dynamicDefault;
        }
        return 0;
    }
}
