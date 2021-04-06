import { SpellGain } from './SpellGain';

export class SpellCast {
    public readonly _className: string = this.constructor.name;
    public level: number = 1;
    public name: string = "";
    //This duration can override the spell's standard duration when applying conditions.
    public duration: number = 0;
    //This is used automatically for sustained spells cast by items. Activities store their spellGain on the ActivityGain;
    public spellGain: SpellGain = new SpellGain();
    public target: "ally"|"self"|"" = "";
}