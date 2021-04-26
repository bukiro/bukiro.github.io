import { EffectGain } from "./EffectGain";
import { Hint } from "./Hint";

export class Material {
    public readonly _className: string = this.constructor.name;
    public bulkPrice: number = 0;
    public bulkModifier: number = 0;
    public craftRequirement: string = "";
    //This is how high your crafting level needs to be to craft with this material.
    public craftingRequirement: number = 4;
    public desc: string = "";
    public level: number = 0;
    public name: string = "";
    public price: number = 0;
    public runeLimit: number = 0;
    public traits: string[] = [];
    public extraRune: number = 0;
    public sourceBook: string = "";
    public hints: Hint[] = [];
    public removeTraits: string[] = [];
    public itemFilter: string[] = [];
    get_Name() {
        return this.name.split("(")[0].trim();
    }
}