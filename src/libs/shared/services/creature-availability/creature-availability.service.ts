import { Injectable } from '@angular/core';
import { Creature } from 'src/app/classes/Creature';
import { CharacterService } from 'src/app/services/character.service';
import { CharacterFeatsService } from '../character-feats/character-feats.service';

@Injectable({
    providedIn: 'root',
})
export class CreatureAvailabilityService {

    constructor(
        private readonly _characterService: CharacterService,
        private readonly _characterFeatsService: CharacterFeatsService,
    ) { }

    public isCompanionAvailable(charLevel?: number): boolean {
        const character = this._characterService.character;

        charLevel = charLevel || character.level;

        //Return any feat that grants an animal companion that you own.
        return this._characterFeatsService.characterFeatsAndFeatures()
            .some(feat =>
                feat.gainAnimalCompanion === 'Young' &&
                this._characterFeatsService.characterHasFeat(feat.name, charLevel),
            );
    }

    public isFamiliarAvailable(charLevel?: number): boolean {
        const character = this._characterService.character;

        charLevel = charLevel || character.level;

        //Return any feat that grants an animal companion that you own.
        return this._characterFeatsService.characterFeatsAndFeatures()
            .some(feat =>
                feat.gainFamiliar &&
                this._characterFeatsService.characterHasFeat(feat.name, charLevel),
            );
    }

    public allAvailableCreatures(
        companionAvailable: boolean = this.isCompanionAvailable(),
        familiarAvailable: boolean = this.isFamiliarAvailable(),
    ): Array<Creature> {
        return ([this._characterService.character] as Array<Creature>)
            .concat(
                companionAvailable
                    ? this._characterService.companion
                    : [],
            )
            .concat(
                familiarAvailable
                    ? this._characterService.familiar
                    : [],
            );
    }

}
