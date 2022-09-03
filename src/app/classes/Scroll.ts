import { Consumable } from 'src/app/classes/Consumable';
import { ItemRestoreFn } from 'src/libs/shared/definitions/Types/itemRestoreFn';

export class Scroll extends Consumable {
    //Scrolls should be type "scrolls" to be found in the database
    public readonly type = 'scrolls';

    public recast(restoreFn: ItemRestoreFn): Scroll {
        super.recast(restoreFn);

        return this;
    }

    public clone(restoreFn: ItemRestoreFn): Scroll {
        return Object.assign<Scroll, Scroll>(new Scroll(), JSON.parse(JSON.stringify(this))).recast(restoreFn);
    }

    public isScroll(): this is Scroll { return true; }

    public effectiveName(): string {
        if (this.displayName) {
            return this.displayName;
        } else if (this.storedSpells.length && this.storedSpells[0].spells.length) {
            return `${ this.name } of ${ this.storedSpells[0].spells[0].name }`;
        } else {
            return this.name;
        }
    }
}
