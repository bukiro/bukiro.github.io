import { Injectable } from '@angular/core';
import { Feat } from 'src/app/character-creation/definitions/models/Feat';
import { AnimalCompanion } from 'src/app/classes/AnimalCompanion';
import { AnimalCompanionSpecialization } from 'src/app/classes/AnimalCompanionSpecialization';
import { Character } from 'src/app/classes/Character';
import { Creature } from 'src/app/classes/Creature';
import { Familiar } from 'src/app/classes/Familiar';
import { CharacterService } from 'src/app/services/character.service';
import { FamiliarsService } from 'src/app/services/familiars.service';
import { HintEffectsObject } from '../../definitions/interfaces/HintEffectsObject';

interface CreatureEffectsGenerationObjects {
    feats: Array<Feat | AnimalCompanionSpecialization>;
    hintSets: Array<HintEffectsObject>;
}

@Injectable({
    providedIn: 'root',
})
export class CreatureEffectsGenerationService {

    constructor(
        private readonly _characterService: CharacterService,
        private readonly _familiarsService: FamiliarsService,
    ) { }

    public creatureEffectsGenerationObjects(creature: Creature): CreatureEffectsGenerationObjects {
        if (creature.isAnimalCompanion()) {
            return this._animalCompanionEffectsGenerationObjects(creature);
        }

        if (creature.isCharacter()) {
            return this._characterEffectsGenerationObjects(creature);
        }

        if (creature.isFamiliar()) {
            return this._familiarEffectsGenerationObjects(creature);
        }

        return {
            feats: [],
            hintSets: [],
        };
    }

    private _animalCompanionEffectsGenerationObjects(companion: AnimalCompanion): CreatureEffectsGenerationObjects {
        //Return the Companion, its Ancestry's Hints and its Specializations and their Hints for effect generation.
        const feats: Array<AnimalCompanionSpecialization> = [];
        const hintSets: Array<HintEffectsObject> = [];

        companion.class?.ancestry?.hints?.forEach(hint => {
            hintSets.push({ hint, objectName: companion.class.ancestry.name });
        });
        companion.class?.specializations?.filter(spec => spec.effects?.length || spec.hints?.length).forEach(spec => {
            feats.push(spec);
            spec.hints?.forEach(hint => {
                hintSets.push({ hint, objectName: spec.name });
            });
        });

        return { feats, hintSets };
    }

    private _characterEffectsGenerationObjects(character: Character): CreatureEffectsGenerationObjects {
        //Return the Character, its Feats and their Hints for effect generation.
        const feats: Array<Feat> = [];
        const hintSets: Array<HintEffectsObject> = [];

        this._characterService.characterFeatsTaken(0, character.level)
            .map(gain => this._characterService.featsAndFeatures(gain.name)[0])
            .filter(feat => feat && feat.have({ creature: character }, { characterService: this._characterService }))
            .forEach(feat => {
                feats.push(feat);
                feat.hints?.forEach(hint => {
                    hintSets.push({ hint, objectName: feat.name });
                });
            });

        return { feats, hintSets };
    }

    private _familiarEffectsGenerationObjects(familiar: Familiar): CreatureEffectsGenerationObjects {
        //Return the Familiar, its Feats and their hints for effect generation.
        const feats: Array<Feat> = [];
        const hintSets: Array<HintEffectsObject> = [];

        this._familiarsService.familiarAbilities()
            .filter(ability =>
                (ability.effects?.length || ability.hints?.length) &&
                ability.have({ creature: familiar }, { characterService: this._characterService }))
            .filter(ability => ability.effects?.length || ability.hints?.length)
            .forEach(ability => {
                feats.push(ability);
                ability.hints?.forEach(hint => {
                    hintSets.push({ hint, objectName: ability.name });
                });
            });

        return { feats, hintSets };
    }
}
