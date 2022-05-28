import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, HostListener, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CharacterService } from 'src/app/services/character.service';
import { DisplayService } from 'src/app/services/display.service';
import { EffectsService } from 'src/app/services/effects.service';
import { FamiliarsService } from 'src/app/services/familiars.service';
import { RefreshService } from 'src/app/services/refresh.service';

@Component({
    selector: 'app-familiar',
    templateUrl: './familiar.component.html',
    styleUrls: ['./familiar.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamiliarComponent implements OnInit, OnDestroy {

    private showMode = '';
    public mobile = false;

    private changeSubscription: Subscription;
    private viewChangeSubscription: Subscription;

    constructor(
        private readonly changeDetector: ChangeDetectorRef,
        private readonly characterService: CharacterService,
        private readonly refreshService: RefreshService,
        private readonly familiarsService: FamiliarsService,
        private readonly effectsService: EffectsService,
    ) { }

    minimize() {
        this.characterService.character.settings.familiarMinimized = !this.characterService.character.settings.familiarMinimized;
        this.set_Changed('Familiar');
    }

    get_Minimized() {
        return this.characterService.character.settings.familiarMinimized;
    }

    public get stillLoading(): boolean {
        return (this.characterService.stillLoading || this.familiarsService.stillLoading);
    }

    toggleFamiliarMenu() {
        this.characterService.toggleMenu('familiar');
    }

    get_FamiliarMenuState() {
        return this.characterService.familiarMenuState();
    }

    trackByIndex(index: number): number {
        return index;
    }

    set_Changed(target: string) {
        this.refreshService.setComponentChanged(target);
    }

    get_Character() {
        return this.characterService.character;
    }

    get_FamiliarAvailable() {
        return this.characterService.isFamiliarAvailable();
    }

    get_Familiar() {
        return this.characterService.familiar;
    }

    toggle_Mode(type: string) {
        if (this.showMode == type) {
            this.showMode = '';
        } else {
            this.showMode = type;
        }
    }

    get_ShowMode() {
        return this.showMode;
    }

    get_FamiliarAbilitiesFinished() {
        const choice = this.get_Familiar().abilities;
        let available = choice.available;

        this.effectsService.absoluteEffectsOnThis(this.get_Character(), 'Familiar Abilities').forEach(effect => {
            available = parseInt(effect.setValue, 10);
        });
        this.effectsService.relativeEffectsOnThis(this.get_Character(), 'Familiar Abilities').forEach(effect => {
            available += parseInt(effect.value, 10);
        });

        return choice.feats.length >= available;
    }

    set_Mobile() {
        this.mobile = DisplayService.isMobile;
    }

    public ngOnInit(): void {
        this.set_Mobile();
        this.changeSubscription = this.refreshService.componentChanged$
            .subscribe(target => {
                if (['familiar', 'all'].includes(target.toLowerCase())) {
                    this.changeDetector.detectChanges();
                }
            });
        this.viewChangeSubscription = this.refreshService.detailChanged$
            .subscribe(view => {
                if (view.creature.toLowerCase() == 'familiar' && ['familiar', 'all'].includes(view.target.toLowerCase())) {
                    this.changeDetector.detectChanges();
                }
            });
    }

    ngOnDestroy() {
        this.changeSubscription?.unsubscribe();
        this.viewChangeSubscription?.unsubscribe();
    }

    @HostListener('window:resize', ['$event'])
    onResize() {
        this.set_Mobile();
    }

    @HostListener('window:orientationchange', ['$event'])
    onRotate() {
        this.set_Mobile();
    }

}
