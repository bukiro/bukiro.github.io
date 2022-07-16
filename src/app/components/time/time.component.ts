import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, Input, OnDestroy } from '@angular/core';
import { CharacterService } from 'src/app/services/character.service';
import { TimeService } from 'src/app/services/time.service';
import { EffectsService } from 'src/app/services/effects.service';
import { ItemsService } from 'src/app/services/items.service';
import { SpellsService } from 'src/app/services/spells.service';
import { ConditionsService } from 'src/app/services/conditions.service';
import { RefreshService } from 'src/app/services/refresh.service';
import { Subscription } from 'rxjs';
import { Trackers } from 'src/libs/shared/util/trackers';
import { TimePeriods } from 'src/libs/shared/definitions/timePeriods';

@Component({
    selector: 'app-time',
    templateUrl: './time.component.html',
    styleUrls: ['./time.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeComponent implements OnInit, OnDestroy {

    @Input()
    public showTurn = true;
    @Input()
    public showTime = true;

    private _changeSubscription: Subscription;
    private _viewChangeSubscription: Subscription;

    constructor(
        private readonly _changeDetector: ChangeDetectorRef,
        private readonly _characterService: CharacterService,
        private readonly _refreshService: RefreshService,
        private readonly _timeService: TimeService,
        private readonly _itemsService: ItemsService,
        private readonly _spellsService: SpellsService,
        private readonly _effectsService: EffectsService,
        private readonly _conditionsService: ConditionsService,
        public trackers: Trackers,
    ) { }

    public get isMinimized(): boolean {
        return this._characterService.character.settings.timeMinimized;
    }

    public get stillLoading(): boolean {
        return this._characterService.stillLoading;
    }

    public get yourTurn(): TimePeriods.NoTurn | TimePeriods.HalfTurn {
        return this._timeService.yourTurn;
    }

    public minimize(): void {
        this._characterService.character.settings.timeMinimized = !this._characterService.character.settings.timeMinimized;
    }

    public durationDescription(duration: number, includeTurnState = true, short = false): string {
        return this._timeService.durationDescription(duration, includeTurnState, false, short);
    }

    public waitingDescription(duration: number): string {
        return this._timeService.waitingDescription(
            duration,
            { characterService: this._characterService, conditionsService: this._conditionsService },
            { includeResting: false },
        );
    }

    public startTurn(): void {
        this._timeService.startTurn(
            this._characterService,
            this._conditionsService,
            this._itemsService,
            this._spellsService,
            this._effectsService,
        );
    }

    public endTurn(): void {
        this._timeService.endTurn(this._characterService, this._conditionsService, this._itemsService, this._spellsService);
    }

    public tick(amount: number): void {
        this._timeService.tick(this._characterService, this._conditionsService, this._itemsService, this._spellsService, amount);
    }

    public ngOnInit(): void {
        this._changeSubscription = this._refreshService.componentChanged$
            .subscribe(target => {
                if (['time', 'all', 'character'].includes(target.toLowerCase())) {
                    this._changeDetector.detectChanges();
                }
            });
        this._viewChangeSubscription = this._refreshService.detailChanged$
            .subscribe(view => {
                if (view.creature.toLowerCase() === 'character' && ['time', 'all'].includes(view.target.toLowerCase())) {
                    this._changeDetector.detectChanges();
                }
            });
    }

    public ngOnDestroy(): void {
        this._changeSubscription?.unsubscribe();
        this._viewChangeSubscription?.unsubscribe();
    }

}
