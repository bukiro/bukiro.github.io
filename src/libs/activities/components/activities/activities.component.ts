import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, Input, OnDestroy } from '@angular/core';
import { CreatureService } from 'src/libs/shared/services/creature/creature.service';
import { ActivityGain } from 'src/app/classes/ActivityGain';
import { Character } from 'src/app/classes/Character';
import { FeatChoice } from 'src/libs/shared/definitions/models/FeatChoice';
import { ItemActivity } from 'src/app/classes/ItemActivity';
import { RefreshService } from 'src/libs/shared/services/refresh/refresh.service';
import { combineLatest, distinctUntilChanged, map, Observable, of, shareReplay, Subscription, switchMap } from 'rxjs';
import { Activity } from 'src/app/classes/Activity';
import { Creature } from 'src/app/classes/Creature';
import { Skill } from 'src/app/classes/Skill';
import { CreatureTypes } from 'src/libs/shared/definitions/creatureTypes';
import { sortAlphaNum } from 'src/libs/shared/util/sortUtils';
import { SkillValuesService } from 'src/libs/shared/services/skill-values/skill-values.service';
import { ActivityPropertiesService } from 'src/libs/shared/services/activity-properties/activity-properties.service';
import { ActivityGainPropertiesService } from 'src/libs/shared/services/activity-gain-properties/activity-gain-properties.service';
import { CreatureActivitiesService } from 'src/libs/shared/services/creature-activities/creature-activities.service';
import { SkillsDataService } from 'src/libs/shared/services/data/skills-data.service';
import { TrackByMixin } from 'src/libs/shared/util/mixins/track-by-mixin';
import { SettingsService } from 'src/libs/shared/services/settings/settings.service';
import { propMap$ } from 'src/libs/shared/util/observableUtils';
import { BaseCreatureElementComponent } from 'src/libs/shared/util/components/base-creature-element/base-creature-element.component';
import { isEqualSerializableArray } from 'src/libs/shared/util/compare-utils';

interface ActivitySet {
    name: string;
    gain: ActivityGain | ItemActivity;
    activity: Activity | ItemActivity;
}

interface ActivityParameter {
    name: string;
    gain: ActivityGain | ItemActivity;
    activity: Activity | ItemActivity;
    maxCharges: number;
    cooldown: number;
    disabledReason: string;
    hostile: boolean;
}

@Component({
    selector: 'app-activities',
    templateUrl: './activities.component.html',
    styleUrls: ['./activities.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivitiesComponent extends TrackByMixin(BaseCreatureElementComponent) implements OnInit, OnDestroy {

    public isMinimized$: Observable<boolean>;
    public isTileMode$: Observable<boolean>;

    private _showActivity = '';
    private _showItem = '';
    private _showFeatChoice = '';

    private _changeSubscription?: Subscription;
    private _viewChangeSubscription?: Subscription;

    constructor(
        private readonly _changeDetector: ChangeDetectorRef,
        private readonly _refreshService: RefreshService,
        private readonly _skillValuesService: SkillValuesService,
        private readonly _activityPropertiesService: ActivityPropertiesService,
        private readonly _activityGainPropertyService: ActivityGainPropertiesService,
        private readonly _creatureActivitiesService: CreatureActivitiesService,
        private readonly _skillsDataService: SkillsDataService,
    ) {
        super();

        this.isMinimized$ = this.creature$
            .pipe(
                switchMap(creature => SettingsService.settings$
                    .pipe(
                        switchMap(settings => {
                            switch (creature.type) {
                                case CreatureTypes.AnimalCompanion:
                                    return settings.companionMinimized$;
                                case CreatureTypes.Familiar:
                                    return settings.familiarMinimized$;
                                default:
                                    return settings.activitiesMinimized$;
                            }
                        }),
                    ),
                ),
                distinctUntilChanged(),
            );

        this.isTileMode$ = propMap$(SettingsService.settings$, 'activitiesTileMode$')
            .pipe(
                distinctUntilChanged(),
                shareReplay({ refCount: true, bufferSize: 1 }),
            );
    }

    public get creature(): Creature {
        return super.creature;
    }

    @Input()
    public set creature(creature: Creature) {
        this._updateCreature(creature);
    }

    public get shouldShowMinimizeButton(): boolean {
        return this.creature.isCharacter();
    }

    private get _character(): Character {
        return CreatureService.character;
    }

    public toggleMinimized(minimized: boolean): void {
        SettingsService.settings.activitiesMinimized = minimized;
    }

    public toggleTileMode(isTileMode: boolean): void {
        SettingsService.settings.activitiesTileMode = !isTileMode;
    }

    public toggleShownActivity(id: string): void {
        this._showActivity = this._showActivity = id ? '' : id;
    }

    public shownActivity(): string {
        return this._showActivity;
    }

    public receiveShownFeatChoiceMessage(name: string): void {
        this._toggleShownFeatChoice(name);
    }

    public receiveShownFeatMessage(name: string): void {
        this._toggleShownItem(name);
    }

    public shownItem(): string {
        return this._showItem;
    }

    public shownFeatChoice(): string {
        return this._showFeatChoice;
    }

    public activityParameters$(): Observable<Array<ActivityParameter>> {
        return this._ownedActivities$()
            .pipe(
                switchMap(gainSets => combineLatest(
                    gainSets.map(gainSet => {
                        const creature = this.creature;

                        const maxCharges$ = this._activityPropertiesService.effectiveMaxCharges$(gainSet.activity, { creature });

                        return combineLatest([
                            maxCharges$,
                            this._activityPropertiesService.effectiveCooldown$(gainSet.activity, { creature }),
                            this._activityGainPropertyService.disabledReason$(gainSet.gain, { creature, maxCharges$ }),
                        ])
                            .pipe(
                                map(([maxCharges, cooldown, disabledReason]) => ({
                                    name: gainSet.name,
                                    gain: gainSet.gain,
                                    activity: gainSet.activity,
                                    maxCharges,
                                    cooldown,
                                    disabledReason,
                                    hostile: gainSet.activity.isHostile(),
                                })),
                            );
                    }),
                )),
            );
    }

    //TO-DO: customskills() should become async.
    public classDCs$(): Observable<Array<Skill>> {
        return combineLatest(
            this._skillsDataService
                .skills(this.creature.customSkills, '', { type: 'Class DC' })
                .map(skill =>
                    this._skillValuesService.level$(skill, this.creature)
                        .pipe(
                            map(level => ({ skill, level })),
                        ),
                ),
        )
            .pipe(
                map(skillSets =>
                    skillSets
                        .filter(skillSet => skillSet.level > 0)
                        .map(skillSet => skillSet.skill),
                ),
            );
    }

    public temporaryFeatChoices(): Array<FeatChoice> {
        const choices: Array<FeatChoice> = [];

        if (this.creature.isCharacter()) {
            (this.creature as Character).class.levels
                .filter(level => level.number <= this.creature.level)
                .forEach(level => {
                    choices.push(...level.featChoices.filter(choice => choice.showOnSheet));
                });
        }

        return choices;
    }

    public ngOnInit(): void {
        this._changeSubscription = this._refreshService.componentChanged$
            .subscribe(target => {
                if (target === 'activities' || target === 'all' || target.toLowerCase() === this.creature.type.toLowerCase()) {
                    this._changeDetector.detectChanges();
                }
            });
        this._viewChangeSubscription = this._refreshService.detailChanged$
            .subscribe(view => {
                if (
                    view.creature.toLowerCase() === this.creature.type.toLowerCase() &&
                    ['activities', 'all'].includes(view.target.toLowerCase())
                ) {
                    this._changeDetector.detectChanges();
                }
            });
    }

    public ngOnDestroy(): void {
        this._changeSubscription?.unsubscribe();
        this._viewChangeSubscription?.unsubscribe();
    }

    private _toggleShownItem(name: string): void {
        this._showItem = this._showItem === name ? '' : name;
    }

    private _toggleShownFeatChoice(name = ''): void {
        if (this._showFeatChoice === name) {
            this._showFeatChoice = '';
        } else {
            this._showFeatChoice = name;
            this._showActivity = '';
        }
    }

    private _fuseStanceName$(): Observable<string> {
        return this._character.class.filteredFeatData$(0, 0, 'Fuse Stance')
            .pipe(
                map(data => data?.[0]?.valueAsString('name') ?? 'Fused Stance'),
                distinctUntilChanged(),
            );
    }

    private _ownedActivities$(): Observable<Array<ActivitySet>> {
        const activityName$ = (name: string): Observable<string> => {
            if (name === 'Fused Stance') {
                return this._fuseStanceName$();
            } else {
                return of(name);
            }
        };

        return this._creatureActivitiesService.creatureOwnedActivities$(this.creature)
            .pipe(
                distinctUntilChanged(isEqualSerializableArray),
                map(gains => {
                    const activitySets: Array<ActivitySet> = [];
                    const uniques: Array<string> = [];

                    gains.forEach(gain => {
                        const activity = gain.originalActivity;

                        if (!uniques.includes(gain.name) || gain instanceof ItemActivity) {
                            uniques.push(gain.name);
                            activitySets.push({ name: gain.name, gain, activity });
                        }
                    });

                    return activitySets;
                }),
                switchMap(activitySets => combineLatest(
                    activitySets
                        .map(activitySet =>
                            // Update the name of each activity set, only needed for Fused Stance.
                            activityName$(activitySet.name)
                                .pipe(
                                    map(name => ({ ...activitySet, name })),
                                ),
                        ),
                )),
                map(activitySets => activitySets.sort((a, b) => sortAlphaNum(a.name, b.name))),
            );
    }

}
