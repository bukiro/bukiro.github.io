import { Rune } from 'src/app/classes/Rune';
import { HintEffectsObject } from 'src/libs/shared/effects-generation/definitions/interfaces/HintEffectsObject';
import { RecastFns } from 'src/libs/shared/definitions/interfaces/recastFns';
import { Observable, map } from 'rxjs';
import { MessageSerializable } from 'src/libs/shared/definitions/interfaces/serializable';
import { DeepPartial } from 'src/libs/shared/definitions/types/deepPartial';
import { setupSerializationWithHelpers } from 'src/libs/shared/util/serialization';
import { ItemTypes } from 'src/libs/shared/definitions/types/item-types';

const { assign, forExport, forMessage } = setupSerializationWithHelpers<ArmorRune>({
    primitives: [
        'resilient',
        'nonmetallic',
    ],
    primitiveArrays: [
        'profreq',
    ],
});

export class ArmorRune extends Rune implements MessageSerializable<ArmorRune> {
    //Armor Runes should be type "armorrunes" to be found in the database
    public readonly type: ItemTypes = 'armorrunes';
    public resilient = 0;
    /** If this is set, the armor rune can only be applied to a nonmetallic armor. */
    public nonmetallic = false;

    /** If set, the armor rune can only be applied to an armor with this proficiency. */
    public profreq: Array<string> = [];

    public get secondary(): number {
        return this.resilient;
    }

    public static from(values: DeepPartial<ArmorRune>, recastFns: RecastFns): ArmorRune {
        return new ArmorRune().with(values, recastFns);
    }

    public with(values: DeepPartial<ArmorRune>, recastFns: RecastFns): ArmorRune {
        super.with(values, recastFns);
        assign(this, values, recastFns);

        return this;
    }

    public forExport(): DeepPartial<ArmorRune> {
        return {
            ...super.forExport(),
            ...forExport(this),
        };
    }

    public forMessage(): DeepPartial<ArmorRune> {
        return {
            ...super.forMessage(),
            ...forMessage(this),
        };
    }

    public clone(recastFns: RecastFns): ArmorRune {
        return ArmorRune.from(this, recastFns);
    }

    public isArmorRune(): this is ArmorRune {
        return true;
    }

    public effectsGenerationHints$(): Observable<Array<HintEffectsObject>> {
        return this.effectiveName$()
            .pipe(
                map(objectName =>
                    this.hints.map(hint => ({
                        hint,
                        parentItem: this,
                        objectName,
                    })),
                ),
            );
    }
}
