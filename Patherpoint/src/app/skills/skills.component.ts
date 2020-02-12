import { Component, OnInit } from '@angular/core';
import { AbilitiesService } from '../abilities.service';
import { CharacterService } from '../character.service';
import { SkillsService } from '../skills.service';

@Component({
    selector: 'app-skills',
    templateUrl: './skills.component.html',
    styleUrls: ['./skills.component.css']
})
export class SkillsComponent implements OnInit {

    constructor(
        public characterService: CharacterService,
        public abilitiesService: AbilitiesService,
        public skillsService: SkillsService
    ) { }

    get_Skills(key:string = "", value = undefined, key2:string = "", value2 = undefined, key3:string = "", value3 = undefined) {
        return this.characterService.get_Skills(key, value, key2, value2, key3, value3);
    }

    remove_Lore(skill) {
        this.characterService.remove_Lore(skill);
    }

    still_loading() {
        return this.skillsService.still_loading();
    }

    ngOnInit() {
        this.skillsService.initialize();
    }

}