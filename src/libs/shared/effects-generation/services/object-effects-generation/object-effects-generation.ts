import { Injectable } from '@angular/core';
import { CreatureService } from 'src/libs/shared/services/creature/creature.service';
import { ConditionGain } from 'src/app/classes/ConditionGain';
import { Creature } from 'src/app/classes/Creature';
import { Effect } from 'src/app/classes/Effect';
import { EffectGain } from 'src/app/classes/EffectGain';
import { EvaluationService } from 'src/libs/shared/services/evaluation/evaluation.service';
import { Feat } from 'src/libs/shared/definitions/models/Feat';
import { Item } from 'src/app/classes/Item';
import { Material } from 'src/app/classes/Material';
import { WornItem } from 'src/app/classes/WornItem';
import { BonusTypes } from 'src/libs/shared/definitions/bonusTypes';
import { Observable, combineLatest, map, of, switchMap } from 'rxjs';
import { deepDistinctUntilChangedWithoutID } from 'src/libs/shared/util/observableUtils';

interface EffectObject {
    effects: Array<EffectGain>;
    effectiveName?: () => string;
    name?: string;
}
interface EffectContext {
    readonly creature: Creature;
    readonly object?: EffectObject;
    readonly parentConditionGain?: ConditionGain;
    readonly parentItem?: Item | Material;
}
interface EffectOptions {
    readonly name?: string;
    readonly pretendCharacterLevel?: number;
}

@Injectable({
    providedIn: 'root',
})
export class ObjectEffectsGenerationService {

    constructor(
        private readonly _evaluationService: EvaluationService,
    ) { }

    public effectsFromEffectObject$(
        object: EffectObject,
        context: EffectContext,
        options: EffectOptions = {},
    ): Observable<Array<Effect>> {
        context = {
            object,
            ...context,
        };
        options = {
            name: '',
            pretendCharacterLevel: 0,
            ...options,
        };

        //If an object has effects instructions, such as { affected: "Athletics", value: "+2" }, turn it into an Effect here,
        // then mark the effect as a penalty if the change is negative (except for Bulk).
        // Formulas are allowed, such as "Character.level / 2".
        // Try to get the type, too - if no type is given, set it to untyped.
        // Normally, effects are penalties if the value is negative, but there are exceptions (like in Bulk).
        // An effect with a setValue instead of a value is an absolute effect instead of a penalty or bonus.

        //Get the object name unless a name is enforced.
        let source: string = options.name ? options.name : (object.effectiveName ? object.effectiveName() : object.name) || '';

        //EffectGains come with values that contain a statement.
        //This statement is evaluated by the EvaluationService and then validated here in order to build a working Effect.
        return combineLatest(
            object.effects
                .filter(effectGain =>
                    effectGain.resonant
                        ? (object instanceof WornItem && object.isSlottedAeonStone)
                        : true,
                )
                .map(effectGain => {
                    let shouldShowEffect: boolean | undefined = effectGain.show;
                    let type = BonusTypes.Untyped;
                    let isPenalty = false;

                    if (object === context.creature) {
                        source = effectGain.source || 'Custom Effect';
                    }

                    if (effectGain.type) {
                        type = effectGain.type;
                    }

                    return combineLatest([
                        this._determineEffectValue$(effectGain, source, context, options),
                        effectGain.conditionalToggle
                            ? this._evaluationService.valueFromFormula$(
                                effectGain.conditionalToggle,
                                { ...context, effect: effectGain, effectSourceName: source },
                                options,
                            )
                                .pipe(
                                    map(toggleResult => !!toggleResult),
                                )
                            : of(effectGain.toggle),
                    ])
                        .pipe(
                            switchMap(([{ setValue, value, numericalValue }, isToggledEffect]) =>
                                this._determineEffectTitle$(effectGain, { value, setValue }, { ...context, source }, options)
                                    .pipe(
                                        map(effectTitle => {
                                            if (setValue) {
                                                isPenalty = false;
                                            } else {
                                                //Negative values are penalties unless Bulk is affected.
                                                isPenalty = (numericalValue < 0) === (effectGain.affected !== 'Bulk');
                                            }

                                            // Hide all relative effects that come from feats,
                                            // so we don't see green effects permanently after taking a feat.
                                            const shouldHideEffect = (
                                                shouldShowEffect === undefined &&
                                                object instanceof Feat
                                            );

                                            if (shouldHideEffect) {
                                                shouldShowEffect = false;
                                            }

                                            if (source === 'Custom Effect') {
                                                shouldShowEffect = true;
                                            }

                                            const { targetCreature, targetValue } = this._determineEffectTarget(effectGain, context);

                                            const sourceId = this._determineEffectSource(context);

                                            // Effects that have neither a value nor a toggle don't get created.
                                            const isFunctionalEffect = (
                                                isToggledEffect ||
                                                !!setValue ||
                                                parseInt(value, 10) !== 0
                                            );

                                            return isFunctionalEffect
                                                ? Effect.from({
                                                    value,
                                                    creature: targetCreature,
                                                    type,
                                                    target: targetValue,
                                                    setValue,
                                                    toggled: !!isToggledEffect,
                                                    title: effectTitle,
                                                    source,
                                                    penalty: isPenalty,
                                                    displayed: shouldShowEffect,
                                                    duration: effectGain.duration,
                                                    maxDuration: effectGain.maxDuration,
                                                    cumulative: effectGain.cumulative,
                                                    sourceId,
                                                })
                                                : null;
                                        }),
                                    ),
                            ),
                        );
                }),
        )
            .pipe(
                map(effects =>
                    effects.filter((effect): effect is Effect => !!effect),
                ),
                deepDistinctUntilChangedWithoutID(),
            );
    }

    private _determineEffectValue$(
        effectGain: EffectGain,
        source: string,
        context: EffectContext,
        options: EffectOptions,
    ): Observable<{ value: string; setValue: string; numericalValue: number }> {
        return this._evaluationService.valueFromFormula$(
            effectGain.setValue,
            { ...context, effect: effectGain, effectSourceName: source },
            options,
        )
            .pipe(
                switchMap(setValueResult =>
                    setValueResult !== null
                        ? of({
                            value: '0',
                            numericalValue: 0,
                            setValue: setValueResult.toString(),
                        })
                        : this._evaluationService.valueFromFormula$(
                            effectGain.value,
                            { ...context, effect: effectGain, effectSourceName: source },
                            options,
                        )
                            .pipe(
                                map(valueResult =>
                                    (valueResult && !isNaN(Number(valueResult)) && Number(valueResult) !== Infinity)
                                        ? {
                                            value: valueResult.toString(),
                                            numericalValue: Number(valueResult),
                                            setValue: '',
                                        }
                                        : {
                                            value: '',
                                            numericalValue: 0,
                                            setValue: '',
                                        },
                                ),
                            ),

                ),
            );
    }

    private _determineEffectSource(
        context: {
            object?: EffectObject;
            parentConditionGain?: ConditionGain;
            parentItem?: Item | Material;
        },
    ): string {
        if (context.parentConditionGain) {
            return context.parentConditionGain.id;
        } else if (context.parentItem instanceof Item) {
            return context.parentItem.id;
        } else if (context.object instanceof Creature) {
            return context.object.id;
        }

        return '';
    }

    private _determineEffectTarget(
        effectGain: EffectGain,
        context: { creature: Creature },
    ): { targetCreature: string; targetValue: string } {
        //Effects can affect another creature. In that case, remove the notation and change the target.
        let targetCreature: string = context.creature.id;
        let targetValue: string = effectGain.affected;

        if (effectGain.affected.includes('Character:')) {
            targetCreature = CreatureService.character.id || '';
            targetValue = effectGain.affected.replace('Character:', '');
        }

        if (effectGain.affected.includes('Companion:')) {
            targetCreature = CreatureService.character.class.animalCompanion?.id || '';
            targetValue = effectGain.affected.replace('Companion:', '');
        }

        if (effectGain.affected.includes('Familiar:')) {
            targetCreature = CreatureService.character.class.familiar?.id || '';
            targetValue = effectGain.affected.replace('Familiar:', '');
        }

        return { targetCreature, targetValue };
    }

    private _determineEffectTitle$(
        effectGain: EffectGain,
        values: { value: string; setValue: string },
        context: EffectContext & { source: string },
        options: EffectOptions,
    ): Observable<string> {
        if (effectGain.title) {
            const testTitle =
                effectGain.title
                    .replace(/(^|[^\w])value($|[^\w])/g, `$1${ values.value }$2`)
                    .replace(/(^|[^\w])setValue($|[^\w])/g, `$1${ values.setValue }$2`);

            return this._evaluationService.valueFromFormula$(
                testTitle,
                { ...context, effect: effectGain, effectSourceName: context.source },
                options,
            )
                .pipe(
                    map(title => title?.toString() ?? ''),
                );
        }

        return of('');
    }

}
