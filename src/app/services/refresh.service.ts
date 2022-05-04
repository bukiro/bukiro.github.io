import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { AdventuringGear } from 'src/app/classes/AdventuringGear';
import { AlchemicalBomb } from 'src/app/classes/AlchemicalBomb';
import { AlchemicalPoison } from 'src/app/classes/AlchemicalPoison';
import { Ammunition } from 'src/app/classes/Ammunition';
import { Armor } from 'src/app/classes/Armor';
import { ArmorRune } from 'src/app/classes/ArmorRune';
import { CharacterService } from 'src/app/services/character.service';
import { Creature } from 'src/app/classes/Creature';
import { Effect } from 'src/app/classes/Effect';
import { Equipment } from 'src/app/classes/Equipment';
import { Hint } from 'src/app/classes/Hint';
import { Item } from 'src/app/classes/Item';
import { Oil } from 'src/app/classes/Oil';
import { OtherConsumableBomb } from 'src/app/classes/OtherConsumableBomb';
import { Rune } from 'src/app/classes/Rune';
import { Shield } from 'src/app/classes/Shield';
import { Snare } from 'src/app/classes/Snare';
import { TraitsService } from 'src/app/services/traits.service';
import { Weapon } from 'src/app/classes/Weapon';
import { WornItem } from 'src/app/classes/WornItem';
import { CacheService } from 'src/app/services/cache.service';
import { ActivitiesService } from './activities.service';

@Injectable({
    providedIn: 'root'
})
export class RefreshService {

    public characterChanged$: Observable<string>;
    public viewChanged$: Observable<{ creature: string; target: string; subtarget: string }>;
    private toChange: Array<{ creature: string; target: string; subtarget: string }> = [];
    private readonly changed: BehaviorSubject<string> = new BehaviorSubject<string>('');
    private readonly viewChanged: BehaviorSubject<{ creature: string; target: string; subtarget: string }> = new BehaviorSubject<{ creature: string; target: string; subtarget: string }>({ target: '', creature: '', subtarget: '' });

    constructor(
        private readonly traitsService: TraitsService,
        private readonly cacheService: CacheService
    ) { }

    get get_Changed(): Observable<string> {
        return this.characterChanged$;
    }

    get get_ViewChanged(): Observable<{ creature: string; target: string; subtarget: string }> {
        return this.viewChanged$;
    }

    set_Changed(target = 'all'): void {
        if (['Character', 'Companion', 'Familiar', 'all'].includes(target)) {
            this.clear_ToChange(target);
        }
        this.changed.next(target);
    }

    set_ToChange(creature = 'Character', target = 'all', subtarget = ''): void {
        this.toChange.push({ creature, target, subtarget });
    }

    process_ToChange() {
        ['Character', 'Companion', 'Familiar'].forEach(creature => {
            if (this.toChange.some(view => view.creature == creature && view.target == 'all')) {
                //If "all" is updated for a creature, skip everything else.
                this.clear_ToChange(creature);
                this.set_ViewChanged({ creature, target: 'all', subtarget: '' });
            } else if (this.toChange.some(view => view.creature == creature && view.target == 'effects')) {
                //If "effects" is updated for a creature, keep everything else for later, as effects may stack up more of the others and will update again afterwards.
                this.toChange = this.toChange.filter(view => !(view.creature == creature && view.target == 'effects'));
                this.set_ViewChanged({ creature, target: 'effects', subtarget: '' });
            } else {
                //For the rest, copy the toChange list and clear it, so we don't get a loop if set_ViewChanged() causes more calls of process_ToChange().
                const uniqueOthersStrings = this.toChange.filter(view => view.creature.toLowerCase() == creature.toLowerCase()).map(view => JSON.stringify(view));
                const uniqueOthers = Array.from(new Set(uniqueOthersStrings)).map(view => JSON.parse(view));
                this.clear_ToChange(creature);
                uniqueOthers.forEach(view => {
                    this.set_ViewChanged(view);
                });
            }
        });
    }

    private clear_ToChange(creatureType = 'all'): void {
        this.toChange = this.toChange.filter(view => view.creature.toLowerCase() != creatureType.toLowerCase() && creatureType.toLowerCase() != 'all');
    }

    private set_ViewChanged(view: { creature: string; target: string; subtarget: string }): void {
        this.viewChanged.next(view);
    }

    set_HintsToChange(creature: Creature, hints: Array<Hint> = [], services: { characterService: CharacterService }): void {
        hints.forEach(hint => {
            //Update the tags for every element that is named here.
            hint.showon.split(',').forEach(subtarget => {
                this.set_ToChange(creature.type, 'tags', subtarget.trim());
            });
            //If any activities are named, also update the activities area.
            if (this.get_ActivitiesAffected(creature, hint.showon, services)) {
                this.set_ToChange(creature.type, 'activities');
            }
            if (hint.effects.length) {
                this.set_ToChange(creature.type, 'effects');
            }
        });
        this.set_ToChange(creature.type, 'character-sheet');
    }

    private get_ActivitiesAffected(creature: Creature, targetName: string, services: { characterService: CharacterService }) {
        return services.characterService.get_OwnedActivities(creature, creature.level).some(activity => targetName.includes(activity.name));
    }

    set_AbilityToChange(creature: string, ability: string, services: { characterService: CharacterService }): void {
        //Set refresh commands for all components of the application depending this ability.
        const abilities: Array<string> = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];
        const attacks: Array<string> = ['Dexterity', 'Strength'];
        const defense: Array<string> = ['Constitution', 'Dexterity', 'Wisdom'];
        const general: Array<string> = ['Strength', 'Dexterity', 'Intelligence', 'Wisdom', 'Charisma'];
        const health: Array<string> = ['Constitution'];
        const inventory: Array<string> = ['Strength'];
        const spells: Array<string> = ['Intelligence', 'Charisma', 'Wisdom'];

        //Prepare changes for everything that should be updated according to the ability.
        this.set_ToChange(creature, 'abilities');
        if (abilities.includes(ability)) {
            this.set_ToChange(creature, 'abilities');
            this.set_ToChange(creature, 'individualskills', ability);
        }
        if (attacks.includes(ability)) {
            this.set_ToChange(creature, 'attacks');
        }
        if (defense.includes(ability)) {
            this.set_ToChange(creature, 'defense');
        }
        if (general.includes(ability)) {
            this.set_ToChange(creature, 'general');
        }
        if (health.includes(ability)) {
            this.set_ToChange(creature, 'health');
        }
        if (inventory.includes(ability)) {
            this.set_ToChange(creature, 'inventory');
        }
        if (spells.includes(ability)) {
            this.set_ToChange(creature, 'spells');
            this.set_ToChange(creature, 'spellbook');
            this.set_ToChange(creature, 'spellchoices');
        }
        this.set_ToChange(creature, 'effects');
        this.set_ToChange('Character', 'charactersheet');
        if (ability == 'Intelligence') {
            this.set_ToChange('Character', 'skillchoices');
            services.characterService.update_LanguageList();
        }
    }

    public set_ItemViewChanges(creature: Creature, item: Item, services: { characterService: CharacterService; activitiesService: ActivitiesService }): void {
        this.set_ToChange(creature.type, item.id);
        item.traits.map(trait => this.traitsService.getTraitFromName(trait)).forEach(trait => {
            this.set_HintsToChange(creature, trait.hints, services);
        });
        if (item instanceof AlchemicalBomb || item instanceof OtherConsumableBomb || item instanceof AlchemicalPoison || item instanceof Ammunition || item instanceof Snare) {
            this.set_ToChange(creature.type, 'attacks');
        }
        if (item instanceof Oil) {
            this.set_HintsToChange(creature, item.hints, services);
        }
        if (item instanceof Rune) {
            this.set_RuneViewChanges(creature, item, services);
        }
        if (item instanceof Equipment) {
            this.set_EquipmentViewChanges(creature, item as Equipment, services);
            this.set_HintsToChange(creature, item.hints, services);
        }
    }

    public set_EquipmentChoiceChanges(creature: Creature, item: Equipment, services: { characterService: CharacterService }): void {
        if (item.effects.some(effect => effect.value.includes('Choice'))) {
            this.set_ToChange(creature.type, 'effects');
        }
        if (item.hints.some(hint => hint.effects.some(effect => effect.value.includes('Choice')))) {
            this.set_ToChange(creature.type, 'effects');
        }
        if (item.hints.some(hint => hint.conditionChoiceFilter.length)) {
            this.set_HintsToChange(creature, item.hints, services);
        }
    }

    private set_EquipmentViewChanges(creature: Creature, item: Equipment, services: { characterService: CharacterService; activitiesService: ActivitiesService }): void {
        //Prepare refresh list according to the item's properties.
        if (item instanceof Shield || item instanceof Armor || item instanceof Weapon) {
            this.set_ToChange(creature.type, 'defense');
            //There are effects that are based on your currently equipped armor and shield.
            //That means we have to check the effects whenever we equip or unequip one of those.
            this.set_ToChange(creature.type, 'effects');
        }
        if (item instanceof Weapon || (item instanceof WornItem && item.isHandwrapsOfMightyBlows)) {
            this.set_ToChange(creature.type, 'attacks');
            //There are effects that are based on your currently weapons.
            //That means we have to check the effects whenever we equip or unequip one of those.
            this.set_ToChange(creature.type, 'effects');
        }
        if (item.effects.length) {
            this.set_ToChange(creature.type, 'effects');
        }
        if (item.gainConditions.length) {
            this.set_ToChange(creature.type, 'effects');
        }
        if (item.activities?.length) {
            this.set_ToChange(creature.type, 'activities');
            item.activities.forEach(activity => {
                activity.showonSkill?.split(',').forEach(skillName => {
                    this.set_ToChange(creature.type, 'skills');
                    this.set_ToChange(creature.type, 'individualskills', skillName.trim());
                });
            });
        }
        if (item.gainActivities?.length) {
            this.set_ToChange(creature.type, 'activities');
            item.gainActivities.forEach(gain => {
                gain.get_OriginalActivity(services.activitiesService)?.showonSkill?.split(',').forEach(skillName => {
                    this.set_ToChange(creature.type, 'skills');
                    this.set_ToChange(creature.type, 'individualskills', skillName.trim());
                });
            });
        }
        if (item.gainSpells.length) {
            this.set_ToChange(creature.type, 'spellbook');
            this.set_ToChange(creature.type, 'spells');
        }
        if (item.gainSenses.length) {
            this.set_ToChange(creature.type, 'skills');
        }
        item.propertyRunes.forEach(rune => {
            if (item instanceof Armor) {
                this.set_HintsToChange(creature, rune.hints, services);
                if ((rune as ArmorRune).effects?.length) {
                    this.set_ToChange(creature.type, 'effects');
                }
            }
            if (rune.activities?.length) {
                this.set_ToChange(creature.type, 'activities');
                rune.activities.forEach(activity => {
                    activity.showonSkill?.split(',').forEach(skillName => {
                        this.set_ToChange(creature.type, 'skills');
                        this.set_ToChange(creature.type, 'individualskills', skillName.trim());
                    });
                });
            }
        });
        if (item instanceof AdventuringGear) {
            if (item.isArmoredSkirt) {
                this.set_ToChange(creature.type, 'inventory');
                this.set_ToChange(creature.type, 'defense');
            }
        }
        if (item instanceof WornItem) {
            if (item.isDoublingRings) {
                this.set_ToChange(creature.type, 'inventory');
                this.set_ToChange(creature.type, 'attacks');
            }
            if (item.isHandwrapsOfMightyBlows) {
                this.set_ToChange(creature.type, 'inventory');
                this.set_ToChange(creature.type, 'attacks');
            }
            if (item.isBracersOfArmor) {
                this.set_ToChange(creature.type, 'inventory');
                this.set_ToChange(creature.type, 'defense');
            }
            if (item.isRingOfWizardry) {
                this.set_ToChange(creature.type, 'inventory');
                this.set_ToChange(creature.type, 'spellbook');
                this.set_ToChange(creature.type, 'spells');
            }
            if (item.gainLanguages.length) {
                this.set_ToChange(creature.type, 'general');
            }
            item.aeonStones.forEach(aeonStone => {
                this.set_ItemViewChanges(creature, aeonStone, services);
            });
        }
    }

    private set_RuneViewChanges(creature: Creature, rune: Rune, services: { characterService: CharacterService }) {
        //Prepare refresh list according to the rune's properties.
        this.set_HintsToChange(creature, rune.hints, services);
        if (rune.effects.length) {
            this.set_ToChange(creature.type, 'effects');
        }
        if (rune.activities.length) {
            this.set_ToChange(creature.type, 'activities');
        }
    }

    set_ToChangeByEffectTargets(targets: Array<string>, context: { creature: Creature }): void {
        //Setup lists of names and what they should update.
        const general: Array<string> = ['Max Languages', 'Size'].map(name => name.toLowerCase());
        const generalWildcard: Array<string> = [].map(name => name.toLowerCase());
        const abilities: Array<string> = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'].map(name => name.toLowerCase());
        const abilitiesWildcard: Array<string> = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'].map(name => name.toLowerCase());
        const health: Array<string> = ['HP', 'Fast Healing', 'Hardness', 'Max Dying', 'Max HP', 'Resting HP Gain', 'Temporary HP', 'Resting Blocked'].map(name => name.toLowerCase());
        const healthWildcard: Array<string> = ['Resistance', 'Immunity'].map(name => name.toLowerCase());
        const defense: Array<string> = ['AC', 'Saving Throws', 'Fortitude', 'Reflex', 'Will', 'Dexterity-based Checks and DCs', 'Constitution-based Checks and DCs',
            'Wisdom-based Checks and DCs', 'All Checks and DCs', 'Ignore Armor Penalty', 'Ignore Armor Speed Penalty', 'Proficiency Level', 'Dexterity Modifier Cap'].map(name => name.toLowerCase());
        const effects: Array<string> = ['Encumbered Limit'].map(name => name.toLowerCase());
        const fortitude: Array<string> = ['Constitution-based Checks and DCs'].map(name => name.toLowerCase());
        const reflex: Array<string> = ['Dexterity-based Checks and DCs'].map(name => name.toLowerCase());
        const will: Array<string> = ['Wisdom-based Checks and DCs'].map(name => name.toLowerCase());
        const defenseWildcard: Array<string> = ['Proficiency Level'].map(name => name.toLowerCase());
        const attacks: Array<string> = ['Damage Rolls', 'Dexterity-based Checks and DCs', 'Strength-based Checks and DCs', 'All Checks and DCs',
            'Unarmed Damage per Die', 'Weapon Damage per Die'].map(name => name.toLowerCase());
        const attacksWildcard: Array<string> = ['Attack Rolls', 'Damage', 'Dice Size', 'Dice Number', 'Proficiency Level', 'Reach', 'Damage Per Die', 'Gain Trait', 'Lose Trait'].map(name => name.toLowerCase());
        const individualskills: Array<string> = ['Perception', 'Fortitude', 'Reflex', 'Will', 'Acrobatics', 'Arcana', 'Athletics', 'Crafting', 'Deception', 'Diplomacy', 'Intimidation', 'Medicine',
            'Nature', 'Occultism', 'Performance', 'Religion', 'Society', 'Stealth', 'Survival', 'Thievery', 'Fortitude', 'Reflex', 'Will'].map(name => name.toLowerCase());
        const individualSkillsWildcard: Array<string> = ['Lore', 'Class DC', 'Spell DC', 'Spell Attack', 'Attack Rolls'].map(name => name.toLowerCase());
        const skillsWildcard: Array<string> = ['All Checks and DCs', 'Skill Checks', 'Proficiency Level', 'Recall Knowledge Checks', 'Master Recall Knowledge Checks', 'Saving Throws', 'Speed'].map(name => name.toLowerCase());
        const inventory: Array<string> = ['Bulk', 'Encumbered Limit', 'Max Bulk', 'Max Invested'].map(name => name.toLowerCase());
        const inventoryWildcard: Array<string> = ['Gain Trait', 'Lose Trait'].map(name => name.toLowerCase());
        const spellbook: Array<string> = ['Refocus Bonus Points', 'Focus Points', 'Focus Pool', 'All Checks and DCs', 'Attack Rolls', 'Spell Attack Rolls', 'Spell DCs'].map(name => name.toLowerCase());
        const spellbookWildcard: Array<string> = ['Spell Slots', 'Proficiency Level', 'Spell Level', 'Disabled'].map(name => name.toLowerCase());
        const activities: Array<string> = ['Dexterity-based Checks and DCs', 'Strength-based Checks and DCs', 'All Checks and DCs'].map(name => name.toLowerCase());
        const activitiesWildcard: Array<string> = ['Class DC', 'Charges', 'Cooldown', 'Disabled'].map(name => name.toLowerCase());

        //Then prepare changes for everything that should be updated according to the targets.
        targets.forEach(target => {
            const lowerCaseTarget = target.toLowerCase();
            if (general.includes(lowerCaseTarget) || generalWildcard.some(name => lowerCaseTarget.includes(name))) {
                this.set_ToChange(context.creature.type, 'general');
            }
            if (abilities.includes(lowerCaseTarget)) {
                this.set_ToChange(context.creature.type, 'abilities');
                this.set_ToChange(context.creature.type, 'skills');
                this.set_ToChange(context.creature.type, 'effects');
            }
            abilitiesWildcard.filter(name => lowerCaseTarget.includes(name)).forEach(() => {
                this.set_ToChange(context.creature.type, 'abilities');
                this.set_ToChange(context.creature.type, 'skills');
                this.set_ToChange(context.creature.type, 'effects');
            });
            if (health.includes(lowerCaseTarget) || healthWildcard.some(name => lowerCaseTarget.includes(name))) {
                this.set_ToChange(context.creature.type, 'health');
            }
            if (defense.includes(lowerCaseTarget)) {
                this.set_ToChange(context.creature.type, 'defense');
            }
            if (defenseWildcard.some(name => lowerCaseTarget.includes(name))) {
                this.set_ToChange(context.creature.type, 'defense');
            }
            if (effects.includes(lowerCaseTarget)) {
                //Effects need to be re-generated if new effects are likely to change the effect generation procedure itself
                // or its preflight functions.
                this.set_ToChange(context.creature.type, 'effects');
            }
            if (attacks.includes(lowerCaseTarget) || attacksWildcard.some(name => lowerCaseTarget.includes(name))) {
                this.set_ToChange(context.creature.type, 'attacks');
                this.set_ToChange(context.creature.type, 'individualskills', 'attacks');
            }
            if (individualskills.includes(lowerCaseTarget)) {
                this.set_ToChange(context.creature.type, 'individualskills', lowerCaseTarget);
            }
            if (fortitude.includes(lowerCaseTarget)) {
                this.set_ToChange(context.creature.type, 'individualskills', 'fortitude');
            }
            if (reflex.includes(lowerCaseTarget)) {
                this.set_ToChange(context.creature.type, 'individualskills', 'reflex');
            }
            if (will.includes(lowerCaseTarget)) {
                this.set_ToChange(context.creature.type, 'individualskills', 'will');
            }
            if (individualSkillsWildcard.some(name => lowerCaseTarget.includes(name))) {
                this.set_ToChange(context.creature.type, 'individualskills', lowerCaseTarget);
            }
            if (skillsWildcard.some(name => lowerCaseTarget.includes(name))) {
                this.set_ToChange(context.creature.type, 'skills');
                this.set_ToChange(context.creature.type, 'individualskills', 'all');
            }
            if (inventory.includes(lowerCaseTarget)) {
                this.set_ToChange(context.creature.type, 'inventory');
            }
            if (inventoryWildcard.some(name => lowerCaseTarget.includes(name))) {
                this.set_ToChange(context.creature.type, 'inventory');
            }
            if (spellbook.includes(lowerCaseTarget)) {
                this.set_ToChange(context.creature.type, 'spellbook');
            }
            if (spellbookWildcard.some(name => lowerCaseTarget.includes(name))) {
                this.set_ToChange(context.creature.type, 'spellbook');
            }
            if (activities.includes(lowerCaseTarget)) {
                this.set_ToChange(context.creature.type, 'activities');
            }
            if (activitiesWildcard.some(name => lowerCaseTarget.includes(name))) {
                this.set_ToChange(context.creature.type, 'activities');
            }
            //Specific triggers
            if (lowerCaseTarget == 'familiar abilities') {
                //Familiar abilities effects need to update the familiar's featchoices.
                this.set_ToChange('Familiar', 'featchoices');
            }
        });
    }

    set_ToChangeByEffects(newEffects: Array<Effect>, oldEffects: Array<Effect>, context: { creature: Creature }): void {
        //Set refresh commands for all components of the application depending on whether there are new effects affecting their data,
        // or old effects have been removed.

        const changedEffects: Array<Effect> = [];
        //Collect all new feats that don't exist in the old list or old feats that don't exist in the new list - that is, everything that has changed.
        newEffects.forEach(newEffect => {
            if (!oldEffects.some(oldEffect => JSON.stringify(oldEffect) == JSON.stringify(newEffect))) {
                changedEffects.push(newEffect);
            }
        });
        oldEffects.forEach(oldEffect => {
            if (!newEffects.some(newEffect => JSON.stringify(newEffect) == JSON.stringify(oldEffect))) {
                changedEffects.push(oldEffect);
            }
        });

        //Update various components depending on effect targets.
        this.set_ToChangeByEffectTargets(changedEffects.map(effect => effect.target), context);

        changedEffects.forEach(effect => {
            this.cacheService.set_EffectChanged(effect.target, { creatureTypeId: context.creature.typeId });
        });

        //If any equipped weapon is affected, update attacks, and if any equipped armor or shield is affected, update defense.
        if (context.creature.inventories[0].weapons.some(weapon => weapon.equipped && changedEffects.some(effect => effect.target.toLowerCase() == weapon.name.toLowerCase()))) {
            this.set_ToChange(context.creature.type, 'attacks');
        }
        if (context.creature.inventories[0].armors.some(armor => armor.equipped && changedEffects.some(effect => effect.target.toLowerCase() == armor.name.toLowerCase()))) {
            this.set_ToChange(context.creature.type, 'defense');
        }
        if (context.creature.inventories[0].shields.some(shield => shield.equipped && changedEffects.some(effect => effect.target.toLowerCase() == shield.name.toLowerCase()))) {
            this.set_ToChange(context.creature.type, 'defense');
        }
    }

    initialize() {
        //Prepare the update variables that everything subscribes to.
        this.characterChanged$ = this.changed.asObservable();
        this.viewChanged$ = this.viewChanged.asObservable();
    }

}
