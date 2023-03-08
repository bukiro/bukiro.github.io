import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, TemplateRef } from '@angular/core';
import { CreatureTypes } from 'src/libs/shared/definitions/creatureTypes';
import { QuickdiceComponent } from 'src/libs/shared/quickdice/components/quickdice/quickdice.component';
import { BonusDescription } from 'src/libs/shared/ui/bonus-list';

@Component({
    selector: 'app-attribute-value',
    templateUrl: './attribute-value.component.html',
    styleUrls: ['./attribute-value.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttributeValueComponent {
    @Input()
    public title?: string;

    @Input()
    public subline?: string;

    @Input()
    public value?: number | string;

    @Input()
    public showNotesIcon?: boolean;

    @Input()
    public quickdiceTemplate?: TemplateRef<QuickdiceComponent>;

    @Input()
    public effectsTarget?: { creature: CreatureTypes; target: string };

    @Output()
    public readonly showNotesChange = new EventEmitter<boolean>();

    public hasBonuses = false;
    public hasPenalties = false;
    public hasAbsolutes = false;

    private _bonuses?: Array<BonusDescription>;
    private _showNotes?: boolean | undefined;

    public get showNotes(): boolean | undefined {
        return this._showNotes;
    }

    @Input()
    public set showNotes(showNotes: boolean | undefined) {
        this._showNotes = showNotes;
        this.showNotesChange.emit(!!showNotes);
    }

    // eslint-disable-next-line @typescript-eslint/member-ordering
    public get bonuses(): Array<BonusDescription> | undefined {
        return this._bonuses;
    }

    @Input()
    public set bonuses(bonuses: Array<BonusDescription> | undefined) {
        this._bonuses = bonuses;
        this.hasBonuses = !!bonuses?.some(bonus => bonus.isBonus);
        this.hasPenalties = !!bonuses?.some(bonus => bonus.isPenalty);
        this.hasAbsolutes = !!bonuses?.some(bonus => bonus.isAbsolute);
    }
}