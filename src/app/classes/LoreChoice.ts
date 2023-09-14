import { SkillIncrease } from 'src/app/classes/SkillIncrease';
import { SkillChoice } from 'src/app/classes/SkillChoice';
import { setupSerialization } from 'src/libs/shared/util/serialization';
import { Serializable } from 'src/libs/shared/definitions/interfaces/serializable';
import { DeepPartial } from 'src/libs/shared/definitions/types/deepPartial';

const { assign, forExport } = setupSerialization<LoreChoice>({
    primitives: [
        'available',
        'id',
        'initialIncreases',
        'loreDesc',
        'loreName',
        'maxRank',
        'source',
    ],
    primitiveObjectArrays: [
        'increases',
    ],
});

export class LoreChoice extends SkillChoice implements Serializable<LoreChoice> {
    public available = 0;
    public id = '';
    public initialIncreases = 1;
    public loreDesc = '';
    public loreName = '';
    public maxRank = 0;
    public source = '';

    public increases: Array<SkillIncrease> = [];

    public static from(values: DeepPartial<LoreChoice>): LoreChoice {
        return new LoreChoice().with(values);
    }

    public with(values: DeepPartial<LoreChoice>): LoreChoice {
        super.with(values);

        assign(this, values);

        return this;
    }

    public forExport(): DeepPartial<LoreChoice> {
        return {
            ...super.forExport(),
            ...forExport(this),
        };
    }

    public clone(): LoreChoice {
        return LoreChoice.from(this);
    }

    public isLoreChoice(): this is LoreChoice {
        return true;
    }
}
