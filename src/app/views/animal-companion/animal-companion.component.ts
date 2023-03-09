import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy, HostBinding } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, map, Subject, Subscription, takeUntil } from 'rxjs';
import { Character } from 'src/app/classes/Character';
import { CreatureTypes } from 'src/libs/shared/definitions/creatureTypes';
import { MenuNames } from 'src/libs/shared/definitions/menuNames';
import { MenuState } from 'src/libs/shared/definitions/types/menuState';
import { CreatureService } from 'src/libs/shared/services/creature/creature.service';
import { CreatureAvailabilityService } from 'src/libs/shared/services/creature-availability/creature-availability.service';
import { DisplayService } from 'src/libs/shared/services/display/display.service';
import { MenuService } from 'src/libs/shared/services/menu/menu.service';
import { RefreshService } from 'src/libs/shared/services/refresh/refresh.service';
import { SettingsService } from 'src/libs/shared/services/settings/settings.service';

@Component({
    selector: 'app-animal-companion',
    templateUrl: './animal-companion.component.html',
    styleUrls: ['./animal-companion.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimalCompanionComponent implements OnInit, OnDestroy {

    @HostBinding('class.minimized')
    private _isMinimized = false;

    public hover = '';
    public isMobile = false;
    public creatureTypesEnum = CreatureTypes;

    public isMinimized$ = new BehaviorSubject<boolean>(false);

    private _showMode = '';
    private _changeSubscription?: Subscription;
    private _viewChangeSubscription?: Subscription;
    private readonly _destroyed$ = new Subject<true>();

    constructor(
        private readonly _changeDetector: ChangeDetectorRef,
        private readonly _refreshService: RefreshService,
        private readonly _menuService: MenuService,
        private readonly _creatureAvailabilityService: CreatureAvailabilityService,
    ) {
        SettingsService.settings$
            .pipe(
                takeUntil(this._destroyed$),
                map(settings => settings.companionMinimized),
                distinctUntilChanged(),
            )
            .subscribe(minimized => {
                this._isMinimized = minimized;
                this.isMinimized$.next(this._isMinimized);
            });
    }

    public get character(): Character {
        return CreatureService.character;
    }

    public get companionMenuState(): MenuState {
        return this._menuService.companionMenuState;
    }

    public get isCompanionAvailable(): boolean {
        return this._creatureAvailabilityService.isCompanionAvailable();
    }

    public toggleMinimized(minimized: boolean): void {
        SettingsService.settings.companionMinimized = minimized;
    }

    public toggleCompanionMenu(): void {
        this._menuService.toggleMenu(MenuNames.CompanionMenu);
    }

    public toggleShowMode(type: string): void {
        this._showMode = this._showMode === type ? '' : type;
    }

    public showMode(): string {
        return this._showMode;
    }

    public ngOnInit(): void {
        this._setMobile();
        this._changeSubscription = this._refreshService.componentChanged$
            .subscribe(target => {
                if (['companion', 'all'].includes(target.toLowerCase())) {
                    this._changeDetector.detectChanges();
                }
            });
        this._viewChangeSubscription = this._refreshService.detailChanged$
            .subscribe(view => {
                if (view.creature.toLowerCase() === 'companion' && ['companion', 'all'].includes(view.target.toLowerCase())) {
                    this._changeDetector.detectChanges();
                }
            });
    }

    public ngOnDestroy(): void {
        this._changeSubscription?.unsubscribe();
        this._viewChangeSubscription?.unsubscribe();
        this._destroyed$.next(true);
        this._destroyed$.complete();
    }

    private _setMobile(): void {
        this.isMobile = DisplayService.isMobile;
    }

}
