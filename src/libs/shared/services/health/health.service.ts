import { Injectable } from '@angular/core';
import { ConditionGain } from 'src/app/classes/ConditionGain';
import { Creature } from 'src/app/classes/Creature';
import { Health } from 'src/app/classes/Health';
import { CharacterService } from 'src/app/services/character.service';
import { EffectsService } from 'src/app/services/effects.service';
import { RefreshService } from 'src/app/services/refresh.service';
import { AbilityValuesService } from '../ability-values/ability-values.service';

export interface CalculatedHealth {
    maxHP: { result: number; explain: string };
    currentHP: { result: number; explain: string };
    wounded: number;
    dying: number;
    maxDying: number;
}

@Injectable({
    providedIn: 'root',
})
export class HealthService {

    constructor(
        private readonly _characterService: CharacterService,
        private readonly _effectsService: EffectsService,
        private readonly _refreshService: RefreshService,
        private readonly _abilityValuesService: AbilityValuesService,
    ) { }

    public calculate(health: Health, creature: Creature): CalculatedHealth {
        return {
            maxHP: this.maxHP(creature),
            currentHP: this.currentHP(health, creature),
            wounded: this.wounded(creature),
            dying: this.dying(creature),
            maxDying: this.maxDying(creature),
        };
    }

    public maxHP(creature: Creature): { result: number; explain: string } {
        const charLevel = this._characterService.character.level;
        const conModifier = creature.requiresConForHP
            ? this._abilityValuesService.baseValue('Constitution', creature, charLevel).result
            : 0;
        const baseHP = creature.baseHP(conModifier, charLevel);
        let effectsSum = 0;

        this._effectsService.absoluteEffectsOnThis(creature, 'Max HP').forEach(effect => {
            effectsSum = parseInt(effect.setValue, 10);
            baseHP.explain = `${ effect.source }: ${ effect.setValue }`;
        });
        this._effectsService.relativeEffectsOnThis(creature, 'Max HP').forEach(effect => {
            effectsSum += parseInt(effect.value, 10);
            baseHP.explain += `\n${ effect.source }: ${ effect.value }`;
        });
        baseHP.result = Math.max(0, baseHP.result + effectsSum);
        baseHP.explain = baseHP.explain.trim();

        return baseHP;
    }

    public currentHP(health: Health, creature: Creature): { result: number; explain: string } {
        const maxHP = this.maxHP(creature);
        let sum = maxHP.result + health.temporaryHP[0].amount - health.damage;
        let explain = `Max HP: ${ maxHP.result }`;

        if (health.temporaryHP[0].amount) {
            explain += `\nTemporary HP: ${ health.temporaryHP[0].amount }`;
        }

        //You can never get under 0 HP. If you do (because you just took damage), that gets corrected here,
        // and the health component gets reloaded in case we need to process new conditions.
        if (sum < 0) {
            health.damage = Math.max(0, health.damage + sum);
            sum = 0;
            this._refreshService.prepareDetailToChange(creature.type, 'health');
            this._refreshService.processPreparedChanges();
        }

        explain += `\nDamage taken: ${ health.damage }`;

        return { result: sum, explain };
    }

    public wounded(creature: Creature): number {
        let woundeds = 0;
        const conditions = this._characterService.currentCreatureConditions(creature, 'Wounded');

        if (conditions.length) {
            woundeds = Math.max(...conditions.map(gain => gain.value));
        }

        return Math.max(woundeds, 0);
    }

    public dying(creature: Creature): number {
        let dying = 0;
        const conditions = this._characterService.currentCreatureConditions(creature, 'Dying');

        if (conditions.length) {
            dying = Math.max(...conditions.map(gain => gain.value));
        }

        return Math.max(dying, 0);
    }

    public maxDying(creature: Creature): number {
        const defaultMaxDying = 4;
        let effectsSum = 0;

        this._effectsService.absoluteEffectsOnThis(creature, 'Max Dying').forEach(effect => {
            effectsSum = parseInt(effect.value, 10);
        });
        this._effectsService.relativeEffectsOnThis(creature, 'Max Dying').forEach(effect => {
            effectsSum += parseInt(effect.value, 10);
        });

        return defaultMaxDying + effectsSum;
    }

    public takeDamage(
        health: Health,
        creature: Creature,
        amount: number,
        nonlethal = false,
        wounded: number = this.wounded(creature),
        dying: number = this.dying(creature),
    ): { dyingAddedAmount: number; hasAddedUnconscious: boolean; hasRemovedUnconscious: boolean } {
        //First, absorb damage with temporary HP and add the rest to this.damage.
        //Reset temp HP if it has reached 0, and remove other options if you are starting to use up your first amount of temp HP.
        const diff = Math.min(health.temporaryHP[0].amount, amount);

        health.temporaryHP[0].amount -= diff;
        health.temporaryHP.length = 1;

        if (health.temporaryHP[0].amount <= 0) {
            health.temporaryHP[0] = { amount: 0, source: '', sourceId: '' };
        }

        const remainingAmount = amount - diff;

        health.damage += remainingAmount;

        const currentHP = this.currentHP(health, creature).result;
        let dyingAddedAmount = 0;
        let hasAddedUnconscious = false;
        let hasRemovedUnconscious = false;

        //Don't process conditions in manual mode.
        if (!this._characterService.isManualMode) {
            //Then, if you have reached 0 HP with lethal damage, get dying 1+wounded
            //Dying and maxDying are compared in the Conditions service when Dying is added
            if (!nonlethal && currentHP === 0) {
                if (dying === 0) {
                    if (
                        !this._characterService.currentCreatureConditions(creature, 'Unconscious', '0 Hit Points').length &&
                        !this._characterService.currentCreatureConditions(creature, 'Unconscious', 'Dying').length
                    ) {
                        dyingAddedAmount = wounded + 1;
                        this._characterService.addCondition(
                            creature,
                            Object.assign(new ConditionGain(), { name: 'Dying', value: wounded + 1, source: '0 Hit Points' }),
                            {},
                            { noReload: true },
                        );
                    }
                }
            }

            if (nonlethal && currentHP === 0) {
                if (
                    !this._characterService.currentCreatureConditions(creature, 'Unconscious', '0 Hit Points').length &&
                    !this._characterService.currentCreatureConditions(creature, 'Unconscious', 'Dying').length
                ) {
                    hasAddedUnconscious = true;
                    this._characterService.addCondition(
                        creature,
                        Object.assign(new ConditionGain(), { name: 'Unconscious', source: '0 Hit Points' }),
                        {},
                        { noReload: true },
                    );
                }
            }

            //Wake up if you are unconscious and take damage (without falling under 1 HP)
            if (currentHP > 0) {
                this._characterService.currentCreatureConditions(creature, 'Unconscious').forEach(gain => {
                    hasRemovedUnconscious = true;
                    this._characterService.removeCondition(creature, gain, false);
                });
            }
        }

        return { dyingAddedAmount, hasAddedUnconscious, hasRemovedUnconscious };
    }

    public heal(
        health: Health,
        creature: Creature,
        amount: number,
        wake = true,
        increaseWounded = true,
        dying: number = this.dying(creature),
    ): { hasRemovedDying: boolean; hasRemovedUnconscious: boolean } {
        health.damage = Math.max(0, health.damage - amount);

        let hasRemovedDying = false;
        let hasRemovedUnconscious = false;

        //Don't process conditions in manual mode.
        if (!this._characterService.isManualMode) {
            //Recover from Dying and get Wounded++
            if (this.currentHP(health, creature).result > 0 && dying > 0) {
                this._characterService.currentCreatureConditions(creature, 'Dying').forEach(gain => {
                    hasRemovedDying = true;
                    this._characterService.removeCondition(creature, gain, false, increaseWounded);
                });
            }

            //Wake up from Healing
            if (wake) {
                this._characterService.currentCreatureConditions(creature, 'Unconscious', '0 Hit Points').forEach(gain => {
                    hasRemovedUnconscious = true;
                    this._characterService.removeCondition(creature, gain);
                });
                this._characterService.currentCreatureConditions(creature, 'Unconscious', 'Dying').forEach(gain => {
                    hasRemovedUnconscious = true;
                    this._characterService.removeCondition(creature, gain, false);
                });
            }
        }

        return { hasRemovedDying, hasRemovedUnconscious };
    }

}
