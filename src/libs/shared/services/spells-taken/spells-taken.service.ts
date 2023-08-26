import { Injectable } from '@angular/core';
import { SpellCasting } from 'src/app/classes/SpellCasting';
import { SpellChoice } from 'src/app/classes/SpellChoice';
import { SpellGain } from 'src/app/classes/SpellGain';
import { SpellPropertiesService } from 'src/libs/shared/services/spell-properties/spell-properties.service';
import { SpellCastingTypes } from '../../definitions/spellCastingTypes';
import { SpellTraditions } from '../../definitions/spellTraditions';
import { SpellsDataService } from '../data/spells-data.service';
import { Observable, combineLatest, map, of, switchMap } from 'rxjs';
import { CharacterFlatteningService } from '../character-flattening/character-flattening.service';

@Injectable({
    providedIn: 'root',
})
export class SpellsTakenService {

    constructor(
        private readonly _spellsService: SpellPropertiesService,
        private readonly _spellsDataService: SpellsDataService,
    ) { }

    public takenSpells$(
        minLevelNumber: number,
        maxLevelNumber: number,
        filter: {
            spellLevel?: number;
            spellName?: string;
            spellCasting?: SpellCasting;
            classNames?: Array<string>;
            traditions?: Array<SpellTraditions | ''>;
            castingTypes?: Array<SpellCastingTypes>;
            source?: string;
            sourceId?: string;
            locked?: boolean;
            signatureAllowed?: boolean;
            cantripAllowed?: boolean;
        } = {},
    ): Observable<Array<{ choice: SpellChoice; gain: SpellGain }>> {
        filter = {
            spellLevel: undefined,
            classNames: [],
            traditions: [],
            castingTypes: [],
            locked: undefined,
            signatureAllowed: false,
            cantripAllowed: true,
            ...filter,
        };
        filter.classNames = filter.classNames?.map(name => name.toLowerCase());
        filter.spellName = filter.spellName?.toLowerCase();
        filter.source = filter.source?.toLowerCase();

        const dynamicLevel$ = (choice: SpellChoice, casting: SpellCasting): Observable<number> => (
            this._spellsService.dynamicSpellLevel$(casting, choice)
        );

        const spellLevelMatches$ = (casting: SpellCasting, choice: SpellChoice): Observable<boolean> => (
            filter.spellLevel === undefined
                ? of(true)
                : (choice.dynamicLevel ? dynamicLevel$(choice, casting) : of(choice.level))
                    .pipe(
                        map(choiceLevel => choiceLevel === filter.spellLevel),
                    )
        );

        const choiceLevelMatches = (choice: SpellChoice): boolean => (
            choice.charLevelAvailable >= minLevelNumber && choice.charLevelAvailable <= maxLevelNumber
        );

        const signatureSpellLevelMatches = (choice: SpellChoice): boolean => (
            !!filter.signatureAllowed &&
            choice.spells.some(spell => spell.signatureSpell) &&
            ![0, -1].includes(filter.spellLevel ?? 0)
        );

        const spellMatches = (choice: SpellChoice, gain: SpellGain): boolean => (
            (!filter.spellName || gain.name.toLowerCase() === filter.spellName) &&
            (!filter.source || choice.source.toLowerCase() === filter.source) &&
            (!filter.sourceId || choice.id === filter.sourceId) &&
            ((filter.locked === undefined) || gain.locked === filter.locked) &&
            (
                !(filter.signatureAllowed && gain.signatureSpell) ||
                ((filter.spellLevel ?? 0) >= this._spellsDataService.spellFromName(gain.name)?.levelreq)
            ) &&
            (filter.cantripAllowed || (!this._spellsDataService.spellFromName(gain.name)?.traits.includes('Cantrip')))
        );

        return CharacterFlatteningService.characterSpellCasting$
            .pipe(
                map(spellCasting => spellCasting
                    .filter(casting =>
                        (filter.spellCasting ? casting === filter.spellCasting : true) &&
                        //Castings that have become available on a previous level can still gain spells on this level.
                        //(casting.charLevelAvailable >= minLevelNumber) &&
                        (casting.charLevelAvailable <= maxLevelNumber) &&
                        (filter.classNames?.length ? filter.classNames.includes(casting.className) : true) &&
                        (filter.traditions?.length ? filter.traditions.includes(casting.tradition) : true) &&
                        (filter.castingTypes?.length ? filter.castingTypes.includes(casting.castingType) : true),
                    ),
                ),
                switchMap(spellCasting => combineLatest(
                    spellCasting.map(casting =>
                        combineLatest(casting.spellChoices.map(choice =>
                            (
                                choiceLevelMatches(choice)
                                    ? signatureSpellLevelMatches(choice)
                                        ? of(true)
                                        : spellLevelMatches$(casting, choice)
                                    : of(false)
                            )
                                .pipe(
                                    map(choiceMatches => choiceMatches ? choice : undefined),
                                ),
                        )),
                    ),
                )
                    .pipe(
                        map(spellChoiceLists => {
                            const spellsTaken: Array<{ choice: SpellChoice; gain: SpellGain }> = [];

                            spellChoiceLists
                                .forEach(spellChoiceList => {
                                    spellChoiceList
                                        .filter((choice): choice is SpellChoice => !!choice)
                                        .forEach(choice => {
                                            choice.spells
                                                .filter(gain =>
                                                    spellMatches(choice, gain),
                                                ).forEach(gain => {
                                                    spellsTaken.push({ choice, gain });
                                                });
                                        });
                                });

                            return spellsTaken;
                        }),
                    ),
                ),
            );
    }

}
