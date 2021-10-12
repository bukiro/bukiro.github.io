import { Component, Input, OnInit } from '@angular/core';
import { CharacterService } from '../character.service';
import { Trait } from '../Trait';

@Component({
    selector: 'app-trait',
    templateUrl: './trait.component.html',
    styleUrls: ['./trait.component.css']
})
export class TraitComponent implements OnInit {

    @Input()
    creature: string = "Character";
    @Input()
    trait: Trait;
    @Input()
    name: string;
    @Input()
    object: any = null;

    constructor(
        public characterService: CharacterService
    ) { }

    trackByIndex(index: number, obj: any): any {
        return index;
    }

    get_Creature() {
        return this.characterService.get_Creature(this.creature);
    }

    on_ActivateEffect() {
        this.characterService.set_ToChange(this.creature, "effects");
        this.characterService.process_ToChange();
    }

    get_ObjectTraitActivations() {
        if (this.object && Object.keys(this.object).includes("traitActivations")) {
            if (this.object.cleanup_TraitActivations) {
                this.object.cleanup_TraitActivations();
            }
            return this.object.traitActivations.filter(activation => activation.trait == this.trait.name || (this.trait.dynamic && activation.trait.includes(this.trait.name)));
        }
        return [];
    }

    ngOnInit() {
    }

}