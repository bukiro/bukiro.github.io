import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, Input, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Ability, CalculatedAbility } from 'src/app/classes/Ability';
import { Creature } from 'src/app/classes/Creature';
import { AbilitiesDataService } from 'src/app/core/services/data/abilities-data.service';
import { CharacterService } from 'src/app/services/character.service';
import { EffectsService } from 'src/app/services/effects.service';
import { RefreshService } from 'src/app/services/refresh.service';
import { CreatureTypes } from 'src/libs/shared/definitions/creatureTypes';
import { Trackers } from 'src/libs/shared/util/trackers';

@Component({
    selector: 'app-abilities',
    templateUrl: './abilities.component.html',
    styleUrls: ['./abilities.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AbilitiesComponent implements OnInit, OnDestroy {

    @Input()
    public creature: CreatureTypes.Character | CreatureTypes.AnimalCompanion = CreatureTypes.Character;
    @Input()
    public sheetSide = 'left';

    private _changeSubscription: Subscription;
    private _viewChangeSubscription: Subscription;

    constructor(
        private readonly _changeDetector: ChangeDetectorRef,
        private readonly _abilitiesService: AbilitiesDataService,
        private readonly _characterService: CharacterService,
        private readonly _refreshService: RefreshService,
        private readonly _effectsService: EffectsService,
        public trackers: Trackers,
    ) { }

    public get isMinimized(): boolean {
        return this.creature === CreatureTypes.AnimalCompanion
            ? this._characterService.character.settings.companionMinimized
            : this._characterService.character.settings.abilitiesMinimized;
    }

    public get stillLoading(): boolean {
        return this._abilitiesService.stillLoading || this._characterService.stillLoading;
    }

    private get _currentCreature(): Creature {
        return this._characterService.creatureFromType(this.creature);
    }

    public minimize(): void {
        this._characterService.character.settings.abilitiesMinimized = !this._characterService.character.settings.abilitiesMinimized;
    }

    public abilities(subset = 0): Array<Ability> {
        const all = 0;
        const firstThree = 1;
        const lastThree = 2;
        const thirdAbility = 2;

        switch (subset) {
            case all:
                return this._abilitiesService.abilities();
            case firstThree:
                return this._abilitiesService.abilities().filter((_ability, index) => index <= thirdAbility);
            case lastThree:
                return this._abilitiesService.abilities().filter((_ability, index) => index > thirdAbility);
            default:
                return this._abilitiesService.abilities();
        }
    }

    public calculateAbility(ability: Ability): CalculatedAbility {
        return ability.calculate(this._currentCreature, this._characterService, this._effectsService);
    }

    public ngOnInit(): void {
        this._changeSubscription = this._refreshService.componentChanged$
            .subscribe(target => {
                if (['abilities', 'all', this.creature.toLowerCase()].includes(target)) {
                    this._changeDetector.detectChanges();
                }
            });
        this._viewChangeSubscription = this._refreshService.detailChanged$
            .subscribe(view => {
                if (
                    view.creature.toLowerCase() === this.creature.toLowerCase() &&
                    ['abilities', 'all'].includes(view.target.toLowerCase())
                ) {
                    this._changeDetector.detectChanges();
                }
            });
    }

    public ngOnDestroy(): void {
        this._changeSubscription?.unsubscribe();
        this._viewChangeSubscription?.unsubscribe();
    }

}
