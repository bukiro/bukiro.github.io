import { Injectable } from '@angular/core';
import { Character } from './Character';
import { Skill } from './Skill';
import { Observable, BehaviorSubject } from 'rxjs';
import { Item } from './Item';
import { Class } from './Class';
import { AbilitiesService } from './abilities.service';
import { SkillsService } from './skills.service';
import { Level } from './Level';
import { ClassesService } from './classes.service';
import { ItemCollection } from './ItemCollection';
import { Armor } from './Armor';
import { Weapon } from './Weapon';
import { FeatsService } from './feats.service';
import { TraitsService } from './traits.service';
import { Ancestry } from './Ancestry';
import { HistoryService } from './history.service';
import { Heritage } from './Heritage';
import { Background } from './Background';
import { ItemsService } from './items.service';
import { Feat } from './Feat';
import { Condition } from './Condition';
import { ConditionsService } from './conditions.service';
import { ConditionGain } from './ConditionGain';
import { ActivitiesService } from './activities.service';
import { Activity } from './Activity';
import { ActivityGain } from './ActivityGain';
import { SpellsService } from './spells.service';
import { EffectsService } from './effects.service';
import { Consumable } from './Consumable';
import { TimeService } from './time.service';
import { DefenseService } from './defense.service';
import { Equipment } from './Equipment';
import { EffectGain } from './EffectGain';
import { ItemGain } from './ItemGain';
import { ItemActivity } from './ItemActivity';
import { Rune } from './Rune';
import { DeitiesService } from './deities.service';
import { Deity } from './Deity';
import { AnimalCompanionsService } from './animalcompanions.service';
import { AnimalCompanion } from './AnimalCompanion';
import { Familiar } from './Familiar';
import { SavegameService } from './savegame.service';
import { FamiliarsService } from './familiars.service';
import { FeatChoice } from './FeatChoice';
import { InventoryGain } from './InventoryGain';
import { Oil } from './Oil';
import { WornItem } from './WornItem';
import { Savegame } from './Savegame';
import { ArmorRune } from './ArmorRune';
import { Ammunition } from './Ammunition';
import { Shield } from './Shield';
import { AlchemicalBomb } from './AlchemicalBomb';
import { Snare } from './Snare';
import { AlchemicalPoison } from './AlchemicalPoison';
import { OtherConsumableBomb } from './OtherConsumableBomb';
import { AdventuringGear } from './AdventuringGear';
import { Hint } from './Hint';

@Injectable({
    providedIn: 'root'
})
export class CharacterService {

    private me: Character = new Character();
    public characterChanged$: Observable<string>;
    public viewChanged$: Observable<{ creature: string, target: string, subtarget: string }>;
    private loader = [];
    private loading: boolean = false;
    private basicItems = []
    private toChange: { creature: string, target: string, subtarget: string }[] = [];
    private changed: BehaviorSubject<string> = new BehaviorSubject<string>("");
    private viewChanged: BehaviorSubject<{ creature: string, target: string, subtarget: string }> = new BehaviorSubject<{ creature: string, target: string, subtarget: string }>({ target: "", creature: "", subtarget: "" });

    itemsMenuState: string = 'out';
    itemsMenuTarget: string = 'Character';
    craftingMenuState: string = 'out';
    characterMenuState: string = 'out';
    companionMenuState: string = 'out';
    familiarMenuState: string = 'out';
    spellsMenuState: string = 'out';
    spelllibraryMenuState: string = 'out';
    conditionsMenuState: string = 'out';
    diceMenuState: string = 'out';

    constructor(
        private savegameService: SavegameService,
        public abilitiesService: AbilitiesService,
        private skillsService: SkillsService,
        public classesService: ClassesService,
        public featsService: FeatsService,
        public traitsService: TraitsService,
        private historyService: HistoryService,
        public conditionsService: ConditionsService,
        public activitiesService: ActivitiesService,
        public itemsService: ItemsService,
        public spellsService: SpellsService,
        public effectsService: EffectsService,
        public timeService: TimeService,
        public defenseService: DefenseService,
        public deitiesService: DeitiesService,
        public animalCompanionsService: AnimalCompanionsService,
        public familiarsService: FamiliarsService
    ) { }

    still_loading() {
        return this.loading;
    }

    get_Changed(): Observable<string> {
        return this.characterChanged$;
    }

    get_ViewChanged(): Observable<{ creature: string, target: string, subtarget: string }> {
        return this.viewChanged$;
    }

    set_ToChange(creature: string = "Character", target: string = "all", subtarget: string = "") {
        target = target || "all";
        this.toChange.push({ creature: creature, target: target, subtarget: subtarget });
    }

    set_HintsToChange(creature: string, hints: Hint[] = []) {
        //For transition between single showon strings and multiple hints, we are currently doing both.
        hints.forEach(hint => {
            //Update the tags for every element that is named here.
            hint.showon.split(",").forEach(subtarget => {
                this.set_ToChange(creature, "tags", subtarget.trim())
            })
            //If any activities are named, also update the activities area.
            if (this.get_OwnedActivities(this.get_Creature(creature), this.get_Creature(creature).level).find(activity => hint.showon.includes(activity.name))) {
                this.set_ToChange(creature, "activities")
            }
        })
        this.set_ToChange(creature, "character-sheet");
    }

    set_TagsToChange(creature: string, showonString: string = "") {
        //For transition between single showon strings and multiple hints, we are currently doing both.
        //  Ideally, we can eventually delete this function and clean up every place that uses it.
        
        //Update the tags for every element that is named here.
        showonString.split(",").forEach(subtarget => {
            this.set_ToChange(creature, "tags", subtarget.trim())
        })
        //If any activities are named, also update the activities area.
        if (this.get_OwnedActivities(this.get_Creature(creature), this.get_Creature(creature).level).find(activity => showonString.includes(activity.name))) {
            this.set_ToChange(creature, "activities")
        }
        this.set_ToChange(creature, "character-sheet");
    }

    set_AbilityToChange(creature: string, ability: string) {
        //Set refresh commands for all components of the application depending this ability.
        let abilities: string[] = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"];
        let attacks: string[] = ["Dexterity", "Strength"];
        let defense: string[] = ["Constitution", "Dexterity", "Wisdom"];
        let general: string[] = ["Strength", "Dexterity", "Intelligence", "Wisdom", "Charisma"];
        let health: string[] = ["Constitution"];
        let inventory: string[] = ["Strength"];

        //Prepare changes for everything that should be updated according to the ability.
        this.set_ToChange(creature, "abilities");
        if (abilities.includes(ability)) {
            this.set_ToChange(creature, "abilities");
            this.set_ToChange(creature, "individualskills", ability);
        }
        if (attacks.includes(ability)) {
            this.set_ToChange(creature, "attacks");
        }
        if (defense.includes(ability)) {
            this.set_ToChange(creature, "defense");
        }
        if (general.includes(ability)) {
            this.set_ToChange(creature, "general");
        }
        if (health.includes(ability)) {
            this.set_ToChange(creature, "health");
        }
        if (inventory.includes(ability)) {
            this.set_ToChange(creature, "inventory");
        }
        this.set_ToChange(creature, "effects");
    }

    process_ToChange() {
        ["Character", "Companion", "Familiar"].forEach(creature => {
            if (this.toChange.find(view => view.creature == creature && view.target == "all")) {
                this.clear_ToChange(creature);
                this.set_ViewChanged({ creature: creature, target: "all", subtarget: "" });
            } else {
                //Process effects first, as effects may stack up more of the others.
                let uniqueEffectsStrings = this.toChange.filter(view => view.creature == creature && view.target == "effects").map(view => JSON.stringify(view))
                let uniqueEffects = Array.from(new Set(uniqueEffectsStrings)).map(view => JSON.parse(view));
                uniqueEffects.forEach(view => {
                    this.set_ViewChanged(view);
                });
                //For the rest, copy the toChange list and clear it, so we don't get a loop if set_ViewChanged() causes more calls of process_ToChange().
                let uniqueOthersStrings = this.toChange.filter(view => view.creature == creature && view.target != "effects").map(view => JSON.stringify(view))
                let uniqueOthers = Array.from(new Set(uniqueOthersStrings)).map(view => JSON.parse(view));
                this.clear_ToChange(creature);
                uniqueOthers.forEach(view => {
                    this.set_ViewChanged(view);
                });
            }
            this.set_ViewChanged({ creature: creature, target: "span", subtarget: "" });
        })
    }

    clear_ToChange(creature: string = "all") {
        this.toChange = this.toChange.filter(view => view.creature != creature && creature != "all")
    }

    set_ViewChanged(view: { creature: string, target: string, subtarget: string }) {
        this.viewChanged.next(view);
    }

    set_Changed(target: string = "all") {
        target = target || "all";
        if (["Character", "Companion", "Familiar", "all"].includes(target)) {
            this.clear_ToChange(target);
        }
        this.changed.next(target);
    }

    set_Span(name: string, steps: number = 2) {
        if (document.getElementById(name)) {
            document.getElementById(name).style.gridRow = "span " + this.get_Span(name + "-height", steps);
        }
    }

    get_Span(name: string, steps: number = 2) {
        //Calculates the grid-row span according to the height of the element with id=name
        //Returns a number, so don't forget to use "span "+get_Span(...)
        //Steps is how many 50px-rows the element should grow by at once - I prefer 2 steps (100px) for most
        let height = document.getElementById(name).offsetHeight;
        let margin: number = 16;
        let span = Math.ceil((height + margin) / 50 / steps) * steps;
        return span;
    }

    get_Darkmode() {
        if (!this.still_loading()) {
            return this.get_Character().settings.darkmode;
        } else {
            return false;
        }
    }

    toggleMenu(menu: string = "", parameter: string = "") {
        switch (menu) {
            case "character":
                this.characterMenuState = (this.characterMenuState == 'out') ? 'in' : 'out';
                this.companionMenuState = 'out';
                this.familiarMenuState = 'out';
                this.itemsMenuState = 'out';
                this.craftingMenuState = 'out';
                this.spellsMenuState = 'out';
                this.spelllibraryMenuState = 'out';
                this.conditionsMenuState = 'out';
                this.diceMenuState = 'out';
                if (this.characterMenuState == 'in') {
                    this.set_Changed("charactersheet");
                }
                break;
            case "companion":
                this.characterMenuState = 'out';
                this.companionMenuState = (this.companionMenuState == 'out') ? 'in' : 'out';
                this.familiarMenuState = 'out';
                this.itemsMenuState = 'out';
                this.craftingMenuState = 'out';
                this.spellsMenuState = 'out';
                this.spelllibraryMenuState = 'out';
                this.conditionsMenuState = 'out';
                this.diceMenuState = 'out';
                if (this.companionMenuState == 'in') {
                    this.set_Changed("Companion");
                }
                break;
            case "familiar":
                this.characterMenuState = 'out';
                this.companionMenuState = 'out';
                this.familiarMenuState = (this.familiarMenuState == 'out') ? 'in' : 'out';
                this.itemsMenuState = 'out';
                this.craftingMenuState = 'out';
                this.spellsMenuState = 'out';
                this.spelllibraryMenuState = 'out';
                this.conditionsMenuState = 'out';
                this.diceMenuState = 'out';
                if (this.familiarMenuState == 'in') {
                    this.set_Changed("Familiar");
                }
                break;
            case "items":
                this.characterMenuState = 'out';
                this.companionMenuState = 'out';
                this.familiarMenuState = 'out';
                this.itemsMenuState = (this.itemsMenuState == 'out') ? 'in' : 'out';
                this.craftingMenuState = 'out';
                this.spellsMenuState = 'out';
                this.spelllibraryMenuState = 'out';
                this.conditionsMenuState = 'out';
                this.diceMenuState = 'out';
                if (this.itemsMenuState == 'in') {
                    this.set_Changed("items");
                }
                break;
            case "crafting":
                this.characterMenuState = 'out';
                this.companionMenuState = 'out';
                this.familiarMenuState = 'out';
                this.itemsMenuState = 'out';
                this.craftingMenuState = (this.craftingMenuState == 'out') ? 'in' : 'out';
                this.spellsMenuState = 'out';
                this.spelllibraryMenuState = 'out';
                this.conditionsMenuState = 'out';
                this.diceMenuState = 'out';
                if (this.craftingMenuState == 'in') {
                    this.set_Changed("crafting");
                }
                break;
            case "spells":
                this.characterMenuState = 'out';
                this.companionMenuState = 'out';
                this.familiarMenuState = 'out';
                this.itemsMenuState = 'out';
                this.craftingMenuState = 'out';
                this.spellsMenuState = (this.spellsMenuState == 'out') ? 'in' : 'out';
                this.spelllibraryMenuState = 'out';
                this.conditionsMenuState = 'out';
                this.diceMenuState = 'out';
                if (this.spellsMenuState == 'in') {
                    this.set_Changed("spells");
                }
                break;
            case "spelllibrary":
                this.characterMenuState = 'out';
                this.companionMenuState = 'out';
                this.familiarMenuState = 'out';
                this.itemsMenuState = 'out';
                this.craftingMenuState = 'out';
                this.spellsMenuState = 'out';
                this.spelllibraryMenuState = (this.spelllibraryMenuState == 'out') ? 'in' : 'out';
                this.conditionsMenuState = 'out';
                this.diceMenuState = 'out';
                if (this.spelllibraryMenuState == 'in') {
                    this.set_Changed("spelllibrary");
                }
                break;
            case "conditions":
                this.characterMenuState = 'out';
                this.companionMenuState = 'out';
                this.familiarMenuState = 'out';
                this.craftingMenuState = 'out';
                this.itemsMenuState = 'out';
                this.spellsMenuState = 'out';
                this.spelllibraryMenuState = 'out';
                this.conditionsMenuState = (this.conditionsMenuState == 'out') ? 'in' : 'out';
                this.diceMenuState = 'out';
                if (this.conditionsMenuState == 'in') {
                    this.set_Changed("conditions");
                }
                break;
            case "dice":
                this.characterMenuState = 'out';
                this.companionMenuState = 'out';
                this.familiarMenuState = 'out';
                this.craftingMenuState = 'out';
                this.itemsMenuState = 'out';
                this.spellsMenuState = 'out';
                this.spelllibraryMenuState = 'out';
                this.conditionsMenuState = 'out';
                this.diceMenuState = (this.diceMenuState == 'out') ? 'in' : 'out';
                break;
        }
        this.set_Changed("top-bar");
        if (this.toChange.length) {
            this.process_ToChange();
        }
    }

    get_CharacterMenuState() {
        return this.characterMenuState;
    }

    get_CompanionMenuState() {
        return this.companionMenuState;
    }

    get_FamiliarMenuState() {
        return this.familiarMenuState;
    }

    get_ItemsMenuState() {
        return this.itemsMenuState;
    }

    get_CraftingMenuState() {
        return this.craftingMenuState;
    }

    get_SpellsMenuState() {
        return this.spellsMenuState;
    }

    get_SpellLibraryMenuState() {
        return this.spelllibraryMenuState;
    }

    get_ConditionsMenuState() {
        return this.conditionsMenuState;
    }

    get_DiceMenuState() {
        return this.diceMenuState;
    }

    get_ItemsMenuTarget() {
        return this.itemsMenuTarget;
    }

    set_ItemsMenuTarget(target: string) {
        this.itemsMenuTarget = target;
        this.set_Changed("itemstore");
    }

    get_Level(number: number) {
        return this.get_Character().class.levels[number];
    }

    get_Creature(type: string) {
        switch (type) {
            case "Character":
                return this.get_Character();
            case "Companion":
                return this.get_Companion();
            case "Familiar":
                return this.get_Familiar();
            default:
                return new Character();
        }
    }

    get_Character() {
        if (!this.still_loading()) {
            return this.me;
        } else { return new Character() }
    }

    get_CompanionAvailable(charLevel: number = this.get_Character().level) {
        //Return any feat that grants an animal companion that you own.
        return this.get_FeatsAndFeatures().find(feat => feat.gainAnimalCompanion == 1 && feat.have(this.get_Character(), this, charLevel));
    }

    get_FamiliarAvailable(charLevel: number = this.get_Character().level) {
        //Return any feat that grants an animal companion that you own.
        return this.get_FeatsAndFeatures().find(feat => feat.gainFamiliar && feat.have(this.get_Character(), this, charLevel));
    }

    get_Companion() {
        return this.get_Character().class.animalCompanion;
    }

    get_Familiar() {
        return this.get_Character().class.familiar;
    }

    get_Creatures(companionAvailable: boolean = undefined, familiarAvailable: boolean = undefined) {
        if (!this.still_loading()) {
            if (companionAvailable == undefined) {
                companionAvailable = this.get_CompanionAvailable() != null;
            }
            if (familiarAvailable == undefined) {
                familiarAvailable = this.get_FamiliarAvailable() != null;
            }
            if (companionAvailable && familiarAvailable) {
                return ([] as (Character | AnimalCompanion | Familiar)[]).concat(this.get_Character()).concat(this.get_Companion()).concat(this.get_Familiar());
            } else if (companionAvailable) {
                return ([] as (Character | AnimalCompanion | Familiar)[]).concat(this.get_Character()).concat(this.get_Companion());
            } else if (familiarAvailable) {
                return ([] as (Character | AnimalCompanion | Familiar)[]).concat(this.get_Character()).concat(this.get_Familiar());
            } else {
                return ([] as (Character | AnimalCompanion | Familiar)[]).concat(this.get_Character());
            }
        } else { return [new Character()] }
    }

    reset_Character(id: string = "") {
        this.loading = true;
        this.initialize(id);
    }

    get_Accent() {
        if (!this.still_loading()) {
            function hexToRgb(hex) {
                if (hex.length == 4) {
                    var result = /^#?([a-f\d]{1})([a-f\d]{1})([a-f\d]{1})$/i.exec(hex);
                    return result ? {
                        r: parseInt(result[1] + result[1], 16),
                        g: parseInt(result[2] + result[2], 16),
                        b: parseInt(result[3] + result[3], 16),
                    } : null;
                } else if (hex.length == 7) {
                    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                    return result ? {
                        r: parseInt(result[1], 16),
                        g: parseInt(result[2], 16),
                        b: parseInt(result[3], 16),
                    } : null;
                }
            }
            let original = this.get_Character().settings.accent;
            if (original.length == 4 || original.length == 7) {
                try {
                    let rgba = hexToRgb(original)
                    let result = rgba.r + "," + rgba.g + "," + rgba.b;
                    return result;
                }
                catch (error) {
                    return "25, 118, 210"
                }
            } else {
                return "25, 118, 210";
            }
        }
    }

    get_Classes(name: string) {
        return this.classesService.get_Classes(name);
    }

    get_Ancestries(name: string) {
        this.historyService.get_Ancestries(name)
    }

    get_Deities(name: string = "") {
        return this.deitiesService.get_Deities(name);
    }

    get_Speeds(creature: Character | AnimalCompanion | Familiar, name: string = "") {
        return creature.speeds.filter(speed => speed.name == name || name == "");
    }

    update_LanguageList() {
        //This function is called by the effects service after generating effects, so that new languages aren't thrown out before the effects are generated.
        let character = this.get_Character();
        //Ensure that the language list is always as long as ancestry languages + INT + any relevant feats.
        if (character.class.name) {
            let ancestry: Ancestry = character.class.ancestry;
            let languages: number = character.class.languages.length || 0;
            let maxLanguages: number = ancestry?.baseLanguages || 0;
            let int = this.get_Abilities("Intelligence")[0]?.mod(character, this, this.effectsService)?.result;
            if (int > 0) {
                maxLanguages += int;
            }
            this.effectsService.get_AbsolutesOnThis(this.get_Character(), "Max Languages").forEach(effect => {
                maxLanguages = parseInt(effect.setValue);
            })
            this.effectsService.get_RelativesOnThis(this.get_Character(), "Max Languages").forEach(effect => {
                maxLanguages += parseInt(effect.value);
            })
            let oldLanguages = JSON.stringify(character.class.languages);
            character.class.languages = character.class.languages.sort().filter(language => language != "");
            languages = character.class.languages.length;
            if (languages > maxLanguages) {
                character.class.languages.splice(maxLanguages);
            } else {
                while (languages < maxLanguages) {
                    languages = character.class.languages.push("");
                }
            }
            //If the language list has changed, update the character sheet.
            if (oldLanguages != JSON.stringify(character.class.languages)) {
                this.set_ToChange("Character", "charactersheet");
            }
        }
    }

    change_Class($class: Class) {
        //Cleanup Heritage, Ancestry, Background and class skills
        let character = this.get_Character();
        character.class.on_ChangeHeritage(this);
        character.class.on_ChangeAncestry(this);
        character.class.on_ChangeBackground(this);
        character.class.on_ChangeClass(this);
        character.class = new Class();
        character.class = Object.assign(new Class(), JSON.parse(JSON.stringify($class)));
        character.class = this.reassign(character.class);
        character.class.on_NewClass(this, this.itemsService);
        //After the class change, process all immediate effects from feats (or rather features) that you get from the class - like gaining the Druidic language.
        this.get_FeatsAndFeatures()
            .filter(feat => feat.onceEffects.length && feat.have(character, this, character.level))
            .forEach(feat => {
                feat.onceEffects.forEach(effect => {
                    this.process_OnceEffect(character, effect);
                })
            })
        //Update everything because the class changes everything.
        this.set_Changed();
    }

    change_Ancestry(ancestry: Ancestry, itemsService: ItemsService) {
        let character = this.get_Character();
        this.change_Heritage(new Heritage());
        character.class.on_ChangeAncestry(this);
        character.class.ancestry = new Ancestry();
        character.class.ancestry = Object.assign(new Ancestry(), JSON.parse(JSON.stringify(ancestry)))
        character.class.ancestry = this.reassign(character.class.ancestry);
        character.class.on_NewAncestry(this, itemsService);
    }

    change_Deity(deity: Deity) {
        let character = this.get_Character();
        character.class.deity = deity.name;
        this.set_ToChange("Character", "general");
        this.set_ToChange("Character", "attacks");
    }

    change_Heritage(heritage: Heritage, index: number = -1, source: string = "") {
        let character = this.get_Character();
        character.class.on_ChangeHeritage(this, index);
        if (index == -1) {
            character.class.heritage = new Heritage();
            character.class.heritage = Object.assign(new Heritage(), JSON.parse(JSON.stringify(heritage)))
            character.class.heritage = this.reassign(character.class.heritage);
        } else {
            character.class.additionalHeritages[index] = new Heritage();
            character.class.additionalHeritages[index] = Object.assign(new Heritage(), JSON.parse(JSON.stringify(heritage)))
            character.class.additionalHeritages[index] = this.reassign(character.class.additionalHeritages[index]);
            character.class.additionalHeritages[index].source = source;
        }
        character.class.on_NewHeritage(this, this.itemsService, index);
    }

    change_Background(background: Background) {
        let character = this.get_Character();
        character.class.on_ChangeBackground(this);
        character.class.background = new Background();
        character.class.background = Object.assign(new Background(), JSON.parse(JSON.stringify(background)));
        character.class.background = this.reassign(character.class.background);
        character.class.on_NewBackground(this);
    }

    get_CleanItems() {
        return this.itemsService.get_CleanItems();
    }

    get_Inventories(creature: Character | AnimalCompanion | Familiar) {
        if (!this.still_loading()) {
            return creature.inventories;
        } else { return [new ItemCollection()] }
    }

    get_Specializations(group: string = "") {
        return this.itemsService.get_Specializations(group);
    }

    get_InvestedItems(creature: Character | AnimalCompanion | Familiar) {
        return creature.inventories[0].allEquipment().filter(item => item.invested && item.traits.includes("Invested"));
    }

    create_AdvancedWeaponFeats(advancedWeapons: Weapon[]) {
        //This function depends on the feats and items being loaded, and it will wait forever for them!
        if (this.featsService.still_loading() || this.itemsService.still_loading()) {
            setTimeout(() => {
                this.create_AdvancedWeaponFeats(advancedWeapons);
            }, 500)
        } else {
            if (!advancedWeapons.length) {
                advancedWeapons = this.itemsService.get_ItemsOfType("weapons").filter(weapon => weapon.prof == "Advanced Weapons");
            }
            let advancedWeaponFeats = this.get_Feats().filter(feat => feat.advancedweaponbase);
            advancedWeapons.forEach(weapon => {
                advancedWeaponFeats.forEach(feat => {
                    if (!this.get_Feats().find(libraryFeat => libraryFeat.name == feat.name.replace('Advanced Weapon', weapon.name)) &&
                        !this.get_Character().customFeats.find(customFeat => customFeat.name == feat.name.replace('Advanced Weapon', weapon.name))) {
                        let newLength = this.add_CustomFeat(feat);
                        let newFeat = this.get_Character().customFeats[newLength - 1];
                        newFeat.name = newFeat.name.replace("Advanced Weapon", weapon.name);
                        newFeat.hide = false;
                        newFeat.advancedweaponbase = false;
                        newFeat.subType = newFeat.subType.replace("Advanced Weapon", weapon.name);
                        newFeat.desc = newFeat.desc.replace("Advanced Weapon", weapon.name);
                        newFeat.gainSkillChoice.forEach(choice => {
                            choice.source = choice.source.replace("Advanced Weapon", weapon.name);
                            choice.increases.forEach(increase => {
                                increase.name = increase.name.replace("Advanced Weapon", weapon.name);
                                increase.source = increase.source.replace("Advanced Weapon", weapon.name);
                            })
                        })
                    }
                })
            })
        }
    }

    grant_InventoryItem(creature: Character | AnimalCompanion, inventory: ItemCollection, item: Item, resetRunes: boolean = true, changeAfter: boolean = true, equipAfter: boolean = true, amount: number = 1, newId: boolean = true, expiration: number = 0) {
        this.set_ToChange(creature.type, "inventory");
        let newInventoryItem = this.itemsService.initialize_Item(item, false, newId);
        //Assign the library's item id as the new item's refId. This allows us to read the default information from the library later.
        if (!newInventoryItem.refId) {
            newInventoryItem.refId = item.id;
        }
        let returnedInventoryItem;
        //Check if this item already exists in the inventory, and if it is stackable and doesn't expire. Don't make that check if this item expires.
        let existingItems: Item[] = [];
        if (!expiration) {
            existingItems = inventory[item.type].filter((existing: Item) =>
                existing.name == newInventoryItem.name && newInventoryItem.can_Stack() && !item.expiration
            );
        }
        //If any existing, stackable items are found, try parsing the amount and set it to 1 if failed, then raise the amount on the first of the existing items.
        //The amount must be parsed because it could be set to anything during custom item creation.
        //If no items are found, add the new item to the inventory.
        //Set returnedInventoryItem to either the found or the new item for further processing.
        if (existingItems.length) {
            let intAmount: number = 1
            try {
                intAmount = parseInt(amount.toString())
            } catch (error) {
                intAmount = 1
            }
            existingItems[0].amount += intAmount;
            returnedInventoryItem = existingItems[0];
        } else {
            let newInventoryLength = inventory[item.type].push(newInventoryItem);
            let createdInventoryItem = inventory[item.type][newInventoryLength - 1];
            if (createdInventoryItem.amount && amount > 1) {
                createdInventoryItem.amount = amount;
            }
            if (equipAfter && Object.keys(createdInventoryItem).includes("equipped") && item.equippable) {
                this.onEquip(creature, inventory, createdInventoryItem, true, false);
            }
            if (!item.equippable && (item["gainActivities"]?.length || item["activities"]?.length)) {
                this.set_ToChange(creature.type, "activities");
            }
            returnedInventoryItem = createdInventoryItem;
            if (returnedInventoryItem["prof"] == "Advanced Weapons") {
                this.create_AdvancedWeaponFeats([returnedInventoryItem]);
            }
            if (resetRunes && returnedInventoryItem["moddable"]) {
                if (returnedInventoryItem["potencyRune"]) {
                    returnedInventoryItem["potencyRune"] = 0;
                }
                if (returnedInventoryItem["strikingRune"]) {
                    returnedInventoryItem["strikingRune"] = 0;
                }
                if (returnedInventoryItem["resilientRune"]) {
                    returnedInventoryItem["resilientRune"] = 0;
                }
                if (returnedInventoryItem["propertyRunes"]) {
                    returnedInventoryItem["propertyRunes"].length = 0;
                }
            }
            if (returnedInventoryItem["propertyRunes"] && returnedInventoryItem["propertyRunes"].length) {
                returnedInventoryItem["propertyRunes"].filter((rune: Rune) => rune["loreChoices"]).forEach((rune: Rune) => {
                    this.add_RuneLore(rune as Rune);
                });
            }
        }
        if (returnedInventoryItem["gainInventory"]) {
            returnedInventoryItem["gainInventory"].forEach((gain: InventoryGain) => {
                let newLength = creature.inventories.push(new ItemCollection());
                let newInventory = creature.inventories[newLength - 1];
                newInventory.itemId = returnedInventoryItem.id;
                newInventory.bulkLimit = gain.bulkLimit;
                newInventory.bulkReduction = gain.bulkReduction;
            })
        }
        if (expiration) {
            returnedInventoryItem.expiration = expiration;
        }
        //Add all Items that you get from being granted this one
        if (returnedInventoryItem.gainItems && returnedInventoryItem.gainItems.length) {
            returnedInventoryItem.gainItems.filter((gainItem: ItemGain) => gainItem.on == "grant").forEach(gainItem => {
                let newItem: Item = this.get_CleanItems()[gainItem.type].filter(libraryItem => libraryItem.name == gainItem.name)[0];
                if (newItem.can_Stack()) {
                    this.grant_InventoryItem(creature, inventory, newItem, true, false, false, gainItem.amount + (gainItem.amountPerLevel * creature.level));
                } else {
                    let equip = true;
                    //Don't equip the new item if it's a shield or armor and this one is too - only one shield or armor can be equipped
                    if ((returnedInventoryItem.type == "armors" || returnedInventoryItem.type == "shields") && newItem.type == returnedInventoryItem.type) {
                        equip = false;
                    }
                    let grantedItem = this.grant_InventoryItem(creature, inventory, newItem, true, false, equip);
                    gainItem.id = grantedItem.id;
                    if (grantedItem.get_Name) {
                        grantedItem.grantedBy = "(Granted by " + returnedInventoryItem.name + ")";
                    };
                }
            });
        }
        if (returnedInventoryItem.gainActivities) {
            (returnedInventoryItem as Equipment).gainActivities.forEach((gain: ActivityGain) => {
                gain.active = false;
            });
        }
        if (returnedInventoryItem.activities) {
            (returnedInventoryItem as Equipment).activities.forEach((activity: ItemActivity) => {
                activity.active = false;
            });
        }
        if (returnedInventoryItem.constructor == AlchemicalBomb || returnedInventoryItem.constructor == OtherConsumableBomb || returnedInventoryItem.constructor == Ammunition || returnedInventoryItem.constructor == Snare) {
            this.set_ToChange(creature.type, "attacks");
        }
        returnedInventoryItem["activities"]?.forEach((activity: ItemActivity) => {
            activity.hints?.forEach((hint: Hint) => {
                this.set_TagsToChange(creature.type, hint.showon);
            })
        });
        if (returnedInventoryItem["showon"]) {
            this.set_TagsToChange(creature.type, item["showon"]);
        }
        if (changeAfter) {
            this.process_ToChange();
        }
        return returnedInventoryItem;
    }

    drop_InventoryItem(creature: Character | AnimalCompanion, inventory: ItemCollection, item: Item, changeAfter: boolean = true, equipBasicItems: boolean = true, including: boolean = true, amount: number = 1) {
        this.set_ToChange(creature.type, "inventory");
        if (item.constructor == AlchemicalBomb || item.constructor == OtherConsumableBomb || item.constructor == Ammunition || item.constructor == Snare) {
            this.set_ToChange(creature.type, "attacks");
        }
        if (item["showon"]) {
            this.set_TagsToChange(creature.type, item["showon"]);
        }
        this.set_ItemViewChanges(creature, item);
        if (amount < item.amount) {
            item.amount -= amount;
        } else {
            if (item["equipped"]) {
                this.onEquip(creature, inventory, item as Equipment, false, false);
            } else if (item["invested"] && item.can_Invest()) {
                this.on_Invest(creature, inventory, item as Equipment, false, false);
            }
            if (item["propertyRunes"]) {
                item["propertyRunes"].filter((rune: Rune) => rune.loreChoices.length).forEach((rune: Rune) => {
                    this.remove_RuneLore(rune);
                })
            }
            if (item["appliedOils"]) {
                item["appliedOils"].filter((oil: Oil) => oil.runeEffect.loreChoices.length).forEach((oil: Oil) => {
                    this.remove_RuneLore(oil.runeEffect);
                })
            }
            if (item["activities"]) {
                item["activities"].forEach(activity => {
                    if (activity.active) {
                        this.activitiesService.activate_Activity(creature, "", this, this.conditionsService, this.itemsService, this.spellsService, activity, activity, false);
                    }
                })
            }
            if (item["gainActivities"]) {
                item["gainActivities"].forEach(gain => {
                    if (gain.active) {
                        this.activitiesService.activate_Activity(creature, "", this, this.conditionsService, this.itemsService, this.spellsService, gain, this.activitiesService.get_Activities(gain.name)[0], false);
                    }
                })
            }
            if (item["gainInventory"]) {
                creature.inventories = creature.inventories.filter(inventory => inventory.itemId != item.id);
            }
            if (including && item["gainItems"] && item["gainItems"].length) {
                item["gainItems"].filter((gainItem: ItemGain) => gainItem.on == "grant").forEach(gainItem => {
                    this.lose_GainedItem(creature, gainItem);
                });
            }
            inventory[item.type] = inventory[item.type].filter((any_item: Item) => any_item !== item);
            if (equipBasicItems) {
                this.equip_BasicItems(creature);
            }
        }
        if (changeAfter) {
            this.process_ToChange()
        }
    }

    add_RuneLore(rune: Rune) {
        //Go through all the loreChoices (usually only one)
        rune.loreChoices.forEach(choice => {
            //Check if only one (=this) item's rune has this lore (and therefore no other item has already created it on the character), and if so, create it.
            if (this.get_Character().inventories[0].allEquipment()
                .filter(item => item.propertyRunes
                    .filter(propertyRune => propertyRune.loreChoices
                        .filter(otherchoice => otherchoice.loreName == choice.loreName)
                        .length)
                    .length)
                .length +
                this.get_Character().inventories[0].allEquipment()
                    .filter(item => item.oilsApplied
                        .filter(oil => oil.runeEffect && oil.runeEffect.loreChoices
                            .filter(otherchoice => otherchoice.loreName == choice.loreName)
                            .length)
                        .length)
                    .length == 1) {
                this.get_Character().add_Lore(this, choice);
            }
        });
    }

    remove_RuneLore(rune: Rune) {
        //Iterate through the loreChoices (usually only one)
        rune.loreChoices.forEach(choice => {
            //Check if only one item's rune has this lore (and therefore no other rune still needs it created), and if so, remove it.
            if (this.get_Character().inventories[0].allEquipment()
                .filter(item => item.propertyRunes
                    .filter(propertyRune => propertyRune.loreChoices
                        .filter(otherchoice => otherchoice.loreName == choice.loreName)
                        .length)
                    .length)
                .length +
                this.get_Character().inventories[0].allEquipment()
                    .filter(item => item.oilsApplied
                        .filter(oil => oil.runeEffect && oil.runeEffect.loreChoices
                            .filter(otherchoice => otherchoice.loreName == choice.loreName)
                            .length)
                        .length)
                    .length == 1) {
                this.get_Character().remove_Lore(this, choice);
            }
        });
    }

    change_Cash(multiplier: number = 1, sum: number, plat: number = 0, gold: number = 0, silver: number = 0, copper: number = 0) {
        if (sum) {
            plat = gold = silver = copper = 0;
            plat = Math.floor(sum / 100000) * 100;
            sum %= 100000;
            gold = Math.floor(sum / 100);
            sum %= 100;
            silver = Math.floor(sum / 10);
            sum %= 10;
            copper = sum;
        }
        if (copper) {
            this.get_Character().cash[3] += (copper * multiplier);
            if (this.get_Character().cash[3] < 0) {
                if (this.get_Character().cash[2] > 0 || this.get_Character().cash[1] > 0 || this.get_Character().cash[0] > 0) {
                    silver += Math.floor(this.get_Character().cash[3] / 10) * multiplier;
                    this.get_Character().cash[3] -= Math.floor(this.get_Character().cash[3] / 10) * 10;
                }
            };
        }
        if (silver) {
            this.get_Character().cash[2] += (silver * multiplier);
            if (this.get_Character().cash[2] < 0) {
                if (this.get_Character().cash[1] > 0 || this.get_Character().cash[0] > 0) {
                    gold += Math.floor(this.get_Character().cash[2] / 10) * multiplier;
                    this.get_Character().cash[2] -= Math.floor(this.get_Character().cash[2] / 10) * 10;
                }
            };
        }
        if (gold) {
            this.get_Character().cash[1] += (gold * multiplier);
            if (this.get_Character().cash[1] < 0) {
                if (this.get_Character().cash[0] > 0) {
                    plat += Math.floor(this.get_Character().cash[1] / 10) * multiplier;
                    this.get_Character().cash[1] -= Math.floor(this.get_Character().cash[1] / 10) * 10;
                }
            };
        }
        if (plat) {
            this.get_Character().cash[0] += (plat * multiplier);
            if (this.get_Character().cash[0] < 0) {
                this.sort_Cash();
            }
        }
        if (this.get_Character().cash[0] < 0 || this.get_Character().cash[1] < 0 || this.get_Character().cash[2] < 0) {
            this.sort_Cash();
        }
        this.set_ToChange("Character", "inventory");
    }

    sort_Cash() {
        let sum = (this.get_Character().cash[0] * 1000) + (this.get_Character().cash[1] * 100) + (this.get_Character().cash[2] * 10) + (this.get_Character().cash[3]);
        this.get_Character().cash = [0, 0, 0, 0];
        this.change_Cash(1, sum);
    }

    set_ItemViewChanges(creature: Character | AnimalCompanion, item: Item) {
        if (item.constructor == AlchemicalBomb || item.constructor == OtherConsumableBomb || item.constructor == AlchemicalPoison || item.constructor == Ammunition || item.constructor == Snare) {
            this.set_ToChange(creature.type, "attacks");
        }
        if (item["showon"]) {
            this.set_TagsToChange(creature.type, item["showon"]);
        }
        if (item["effects"]?.length) {
            this.set_ToChange(creature.type, "effects");
        }
        if (item.constructor.prototype instanceof Equipment) {
            this.set_EquipmentViewChanges(this.get_Character(), item as Equipment);
        }
    }

    set_EquipmentViewChanges(creature: Character | AnimalCompanion, item: Equipment) {
        //Prepare refresh list according to the item's properties.
        if (item.constructor == Shield || item.constructor == Armor || item.constructor == Weapon) {
            this.set_ToChange(creature.type, "defense");
            //There are effects that are based on your currently equipped armor and shield.
            //That means we have to check the effects whenever we equip or unequip one of those.
            this.set_ToChange(creature.type, "effects");
        }
        if (item.constructor == Weapon) {
            this.set_ToChange(creature.type, "attacks");
            //There are effects that are based on your currently weapons.
            //That means we have to check the effects whenever we equip or unequip one of those.
            this.set_ToChange(creature.type, "effects");
        }
        item.hints.forEach(hint => {
            this.set_TagsToChange(creature.type, hint.showon);
        })
        item.traits.map(trait => this.traitsService.get_Traits(trait)[0])?.filter(trait => trait?.hints?.length).forEach(trait => {
            trait.hints.forEach(hint => {
                this.set_TagsToChange(creature.type, hint.showon);
            })
        })
        if (item.effects?.length ||
            item.constructor == Armor && (item as Armor).get_Strength()) {
            this.set_ToChange(creature.type, "effects");
        }
        if (item.constructor == Weapon) {
            this.set_ToChange(creature.type, "attacks");
        }
        if (item.constructor == Armor ||
            item.constructor == Shield) {
            this.set_ToChange(creature.type, "defense");
        }
        if (item.activities?.length) {
            this.set_ToChange(creature.type, "activities");
        }
        if (item.gainActivities?.length) {
            this.set_ToChange(creature.type, "activities");
        }
        item.propertyRunes?.forEach((rune: Rune) => {
            if (item.moddable == "armor" && rune.hints?.length) {
                rune.hints.forEach(hint => {
                    this.set_TagsToChange(creature.type, hint.showon);
                })
            }
            if (item.moddable == "armor" && (rune as ArmorRune).effects?.length) {
                this.set_ToChange(creature.type, "effects");
            }
            if (rune.activities?.length) {
                this.set_ToChange(creature.type, "activities");
            }
        });
        if (item.constructor == AdventuringGear) {
            if ((item as AdventuringGear).isArmoredSkirt) {
                this.set_ToChange(creature.type, "inventory");
                this.set_ToChange(creature.type, "defense");
            }
        }
        if (item.constructor == WornItem) {
            if ((item as WornItem).isDoublingRings) {
                this.set_ToChange(creature.type, "inventory");
                this.set_ToChange(creature.type, "attacks");
            }
            if ((item as WornItem).isHandwrapsOfMightyBlows) {
                this.set_ToChange(creature.type, "inventory");
                this.set_ToChange(creature.type, "attacks");
            }
        }
    }

    onEquip(creature: Character | AnimalCompanion, inventory: ItemCollection, item: Equipment, equipped: boolean = true, changeAfter: boolean = true, equipBasicItems: boolean = true) {
        //Only allow equipping or unequipping for items that the creature can wear.
        if ((creature.type == "Character" && !item.traits.includes("Companion")) || (creature.type == "Companion" && item.traits.includes("Companion")) || item.name == "Unarmored") {
            item.equipped = equipped;
            this.set_ToChange(creature.type, "inventory");
            this.set_EquipmentViewChanges(creature, item);
            if (item.equipped) {
                if (item instanceof Armor || item instanceof Shield) {
                    let allOfType = inventory[item.type];
                    //If you equip a shield that is already raised, preserve that status (e.g. for the Shield spell).
                    let raised = false;
                    if (item instanceof Shield && item.raised) {
                        raised = true;
                    }
                    allOfType.forEach(typeItem => {
                        this.onEquip(creature, inventory, typeItem, false, false, false);
                    });
                    item.equipped = true;
                    if (item instanceof Shield) {
                        item.raised = raised;
                    }
                }

                //If you get an Activity from an item that doesn't need to be invested, immediately invest it in secret so the Activity is gained
                if ((item.gainActivities || item.activities) && !item.can_Invest()) {
                    this.on_Invest(creature, inventory, item, true, false);
                }
                //Add all Items that you get from equipping this one
                if (item.gainItems && item.gainItems.length) {
                    item.gainItems.filter((gainItem: ItemGain) => gainItem.on == "equip").forEach(gainItem => {
                        let newItem: Item = this.itemsService.get_Items()[gainItem.type].filter((libraryItem: Item) => libraryItem.name == gainItem.name)[0]
                        if (newItem.can_Stack()) {
                            this.grant_InventoryItem(creature, inventory, newItem, false, false, false, gainItem.amount + (gainItem.amountPerLevel * creature.level));
                        } else {
                            let equip = true;
                            //Don't equip the new item if it's a shield or armor and this one is too - only one shield or armor can be equipped
                            if ((item instanceof Armor || item instanceof Shield) && newItem.type == item.type) {
                                equip = false;
                            }
                            let grantedItem = this.grant_InventoryItem(creature, inventory, newItem, false, false, equip);
                            gainItem.id = grantedItem.id;
                            if (grantedItem.get_Name) {
                                grantedItem.grantedBy = "(Granted by " + item.name + ")"
                            };
                        }
                    });
                }
            } else {
                if (equipBasicItems) {
                    this.equip_BasicItems(creature);
                }
                //If you are unequipping a shield, you should also be lowering it and losing cover
                if (item instanceof Shield) {
                    item.takingCover = false;
                    item.raised = false;
                }
                //If the item was invested, it isn't now.
                if (item.invested) {
                    this.on_Invest(creature, inventory, item, false, false);
                }
                if (item.gainItems?.length) {
                    item.gainItems.filter((gainItem: ItemGain) => gainItem.on == "equip").forEach(gainItem => {
                        this.lose_GainedItem(creature, gainItem);
                    });
                }
                item.propertyRunes?.forEach(rune => {
                    //Deactivate any active toggled activities of inserted runes.
                    rune.activities.filter(activity => activity.toggle && activity.active).forEach(activity => {
                        this.activitiesService.activate_Activity(this.get_Character(), "Character", this, this.conditionsService, this.itemsService, this.spellsService, activity, activity, false);
                    })
                })
            }
            if (changeAfter) {
                this.process_ToChange();
            }
        }
    }

    lose_GainedItem(creature: Character | AnimalCompanion, gainedItem: ItemGain) {
        if (this.itemsService.get_CleanItems()[gainedItem.type].concat(...creature.inventories.map(inventory => inventory[gainedItem.type])).filter((item: Item) => item.name == gainedItem.name)[0].can_Stack()) {
            let amountToDrop = gainedItem.amount || 1;
            creature.inventories.forEach(inventory => {
                let items: Item[] = inventory[gainedItem.type].filter((libraryItem: Item) => libraryItem.name == gainedItem.name);
                items.forEach(item => {
                    if (amountToDrop) {
                        if (item.amount < amountToDrop) {
                            this.drop_InventoryItem(creature, inventory, item, false, false, true, gainedItem.amount - amountToDrop);
                            amountToDrop -= gainedItem.amount;
                        } else {
                            this.drop_InventoryItem(creature, inventory, item, false, false, true, gainedItem.amount);
                            amountToDrop = 0;
                        }
                    }
                });
            });
        } else {
            creature.inventories.forEach(inventory => {
                let items: Item[] = inventory[gainedItem.type].filter((libraryItem: Item) => libraryItem.id == gainedItem.id);
                items.forEach(item => {
                    this.drop_InventoryItem(creature, inventory, item, false, false, true);
                });
            });
            gainedItem.id = "";
        }
    }

    on_Invest(creature: Character | AnimalCompanion, inventory: ItemCollection, item: Equipment, invested: boolean = true, changeAfter: boolean = true) {
        item.invested = invested;
        this.set_ToChange(creature.type, "inventory");
        if (item.invested) {
            if (!item.equipped) {
                this.onEquip(creature, inventory, item, true, false);
            } else {
                this.set_EquipmentViewChanges(creature, item);
            }
        } else {
            item.gainActivities.filter(gainActivity => gainActivity.active).forEach((gainActivity: ActivityGain) => {
                let libraryActivity = this.activitiesService.get_Activities(gainActivity.name)[0];
                if (libraryActivity) {
                    this.activitiesService.activate_Activity(creature, "", this, this.conditionsService, this.itemsService, this.spellsService, gainActivity, libraryActivity, false);
                }
            });
            item.activities.filter(itemActivity => itemActivity.active).forEach((itemActivity: ItemActivity) => {
                this.activitiesService.activate_Activity(creature, "", this, this.conditionsService, this.itemsService, this.spellsService, itemActivity, itemActivity, false);
            })
            this.set_EquipmentViewChanges(creature, item);
        }
        if (changeAfter) {
            this.process_ToChange();
        }
    }

    on_ConsumableUse(creature: Character | AnimalCompanion, item: Consumable) {
        item.amount--
        this.itemsService.process_Consumable(creature, this, this.itemsService, this.conditionsService, this.spellsService, item);
        this.set_ItemViewChanges(creature, item);
        this.set_ToChange(creature.type, "inventory");
    }

    grant_BasicItems() {
        //This function depends on the items being loaded, and it will wait forever for them!
        if (this.itemsService.still_loading()) {
            setTimeout(() => {
                this.grant_BasicItems();
            }, 500)
        } else {
            this.basicItems = [];
            let newBasicWeapon: Weapon = Object.assign(new Weapon(), this.itemsService.get_ItemsOfType("weapons", "Fist")[0]);
            this.basicItems.push(newBasicWeapon);
            let newBasicArmor: Armor;
            newBasicArmor = Object.assign(new Armor(), this.itemsService.get_ItemsOfType("armors", "Unarmored")[0]);
            this.basicItems.push(newBasicArmor);
            this.equip_BasicItems(this.get_Character(), false)
            this.equip_BasicItems(this.get_Companion(), false)
        }
    }

    equip_BasicItems(creature: Character | AnimalCompanion, changeAfter: boolean = true) {
        if (!this.still_loading() && this.basicItems.length) {
            if (!creature.inventories[0].weapons.length && creature.type == "Character") {
                this.grant_InventoryItem(creature, creature.inventories[0], this.basicItems[0], true, false, false);
            }
            if (!creature.inventories[0].armors.length) {
                this.grant_InventoryItem(creature, creature.inventories[0], this.basicItems[1], true, false, false);
            }
            if (!creature.inventories[0].weapons.filter(weapon => weapon.equipped == true).length) {
                if (creature.inventories[0].weapons.length) {
                    this.onEquip(creature, creature.inventories[0], creature.inventories[0].weapons[0], true, changeAfter);
                }
            }
            if (!creature.inventories[0].armors.filter(armor => armor.equipped == true).length) {
                this.onEquip(creature, creature.inventories[0], creature.inventories[0].armors[0], true, changeAfter);
            }
        }
    }

    add_CustomSkill(skillName: string, type: string, abilityName: string, locked: boolean = false, recallKnowledge: boolean = false) {
        this.get_Character().customSkills.push(new Skill(abilityName, skillName, type, locked, recallKnowledge));
    }

    remove_CustomSkill(oldSkill: Skill) {
        this.get_Character().customSkills = this.get_Character().customSkills.filter(skill => skill !== oldSkill);
    }

    add_CustomFeat(oldFeat: Feat) {
        let newLength = this.get_Character().customFeats.push(Object.assign(new Feat(), JSON.parse(JSON.stringify(oldFeat))));
        this.set_ToChange("Character", "charactersheet");
        return newLength;
    }

    remove_CustomFeat(oldFeat: Feat) {
        this.get_Character().customFeats = this.get_Character().customFeats.filter(skill => skill !== oldFeat);
    }

    get_Conditions(name: string = "", type: string = "") {
        return this.conditionsService.get_Conditions(name, type);
    }

    get_AppliedConditions(creature: Character | AnimalCompanion | Familiar, name: string = "", source: string = "", readonly: boolean = false) {
        //Returns ConditionGain[] with apply=true/false for each
        return this.conditionsService.get_AppliedConditions(creature, this, creature.conditions, readonly).filter(condition =>
            (condition.name == name || name == "") &&
            (condition.source == source || source == "")
        );
    }

    add_Condition(creature: Character | AnimalCompanion | Familiar, conditionGain: ConditionGain, reload: boolean = true) {
        let activate: boolean = true;
        //If the condition has an activationPrerequisite, test that first and only activate if it evaluates to a nonzero number.
        if (conditionGain.activationPrerequisite) {
            let testEffectGain: EffectGain = new EffectGain();
            testEffectGain.value = conditionGain.activationPrerequisite;
            let effects = this.effectsService.get_SimpleEffects(this.get_Character(), this, { effects: [testEffectGain], value: conditionGain.value, heightened: conditionGain.heightened, choice: conditionGain.choice, spellCastingAbility: null });
            if (effects?.[0]?.value == "0" || !(parseInt(effects?.[0]?.value))) {
                activate = false;
            }
        }
        if (activate) {
            let originalCondition = this.get_Conditions(conditionGain.name)[0];
            if (originalCondition) {
                if (originalCondition.nextStage) {
                    this.set_ToChange(creature.type, "time");
                    this.set_ToChange(creature.type, "health");
                }
                conditionGain.nextStage = originalCondition.nextStage;
                conditionGain.decreasingValue = originalCondition.decreasingValue;
                //The gain may be persistent by itself, so don't overwrite it with the condition's persistence, but definitely set it if the condition is.
                if (originalCondition.persistent) {
                    conditionGain.persistent = true;
                }
                if (originalCondition.choices.length && !conditionGain.choice) {
                    conditionGain.choice = originalCondition.choice ? originalCondition.choice : originalCondition.choices[0];
                }
                let newLength: number = 0;
                if (conditionGain.addValue) {
                    let existingConditions = creature.conditions.filter(gain => gain.name == conditionGain.name);
                    if (existingConditions.length) {
                        existingConditions.forEach(gain => {
                            gain.value += conditionGain.addValue;
                        })
                    } else {
                        conditionGain.value = conditionGain.addValue;
                        newLength = creature.conditions.push(conditionGain);
                    }
                } else {
                    newLength = creature.conditions.push(conditionGain);
                }
                if (newLength) {
                    let newConditionGain = creature.conditions[newLength - 1];
                    this.conditionsService.process_Condition(creature, this, this.effectsService, this.itemsService, conditionGain, this.conditionsService.get_Conditions(conditionGain.name)[0], true);
                    originalCondition.gainConditions.filter(extraCondition => !extraCondition.conditionChoiceFilter || extraCondition.conditionChoiceFilter == newConditionGain.choice).forEach(extraCondition => {
                        let addCondition = Object.assign(new ConditionGain, JSON.parse(JSON.stringify(extraCondition)));
                        addCondition.source = newConditionGain.name;
                        addCondition.apply = true;
                        this.add_Condition(creature, addCondition, false)
                    })
                    this.set_ToChange(creature.type, "effects");
                    if (reload) {
                        this.process_ToChange();
                    }
                    return newLength;
                }
            }
        }
    }

    remove_Condition(creature: Character | AnimalCompanion | Familiar, conditionGain: ConditionGain, reload: boolean = true, increaseWounded: boolean = true, keepPersistent: boolean = false) {
        //Find the correct condition to remove. This can be the exact same as the conditionGain parameter, but if it isn't, find the most similar one:
        //- Find all conditions with similar name, value and source, then if there are more than one of those:
        //-- Try finding one that has the exact same attributes.
        //-- If none is found, find one that has the same duration.
        //- If none is found or the list has only one, take the first.
        let oldConditionGain: ConditionGain = creature.conditions.find($condition => $condition === conditionGain);
        if (!oldConditionGain) {
            let oldConditionGains: ConditionGain[] = creature.conditions.filter($condition => $condition.name == conditionGain.name && $condition.value == conditionGain.value && $condition.source == conditionGain.source);
            if (oldConditionGains.length > 1) {
                oldConditionGain = oldConditionGains.find($condition => JSON.stringify($condition) == JSON.stringify(conditionGain))
                if (!oldConditionGain) {
                    oldConditionGain = oldConditionGains.find($condition => $condition.duration == conditionGain.duration)
                }
            }
            if (!oldConditionGain) {
                oldConditionGain = oldConditionGains[0]
            }
        }
        let originalCondition = this.get_Conditions(conditionGain.name)[0];
        if (oldConditionGain && !(keepPersistent && oldConditionGain.persistent)) {
            if (oldConditionGain.nextStage) {
                this.set_ToChange(creature.type, "time");
                this.set_ToChange(creature.type, "health");
            }
            originalCondition.gainConditions.filter(extraCondition => !extraCondition.conditionChoiceFilter || extraCondition.conditionChoiceFilter == oldConditionGain.choice).forEach(extraCondition => {
                let addCondition = Object.assign(new ConditionGain, JSON.parse(JSON.stringify(extraCondition)));
                addCondition.source = oldConditionGain.name;
                this.remove_Condition(creature, addCondition, false, increaseWounded, keepPersistent)
            })
            creature.conditions.splice(creature.conditions.indexOf(oldConditionGain), 1)
            this.conditionsService.process_Condition(creature, this, this.effectsService, this.itemsService, oldConditionGain, originalCondition, false, increaseWounded);
            this.set_ToChange(creature.type, "effects");
            if (reload) {
                this.process_ToChange();
            }
        }

    }

    change_ConditionStage(creature: Character | AnimalCompanion | Familiar, gain: ConditionGain, condition: Condition, change: number) {
        if (change == 0) {
            //If no change, the condition remains, but the onset is reset.
            gain.nextStage = condition.nextStage;
            this.set_ToChange(creature.type, "time");
            this.set_ToChange(creature.type, "health");
            this.set_ToChange(creature.type, "effects");
        } else {
            let newGain: ConditionGain = new ConditionGain();
            newGain.nextStage = condition.nextStage;
            if (condition.nextStage) {
                this.set_ToChange(creature.type, "time");
                this.set_ToChange(creature.type, "health");
            }
            newGain.source = gain.source;
            if (change > 0) {
                newGain.name = condition.nextCondition.name;
                newGain.duration = condition.nextCondition.duration ? condition.nextCondition.duration : gain.duration;
            } else if (change < 0) {
                newGain.name = condition.previousCondition.name;
                newGain.duration = condition.previousCondition.duration ? condition.previousCondition.duration : gain.duration;
            }
            this.remove_Condition(creature, gain, false);
            this.add_Condition(creature, newGain, false);
        }
        this.process_ToChange();
    }

    process_OnceEffect(creature: Character | AnimalCompanion | Familiar, effectGain: EffectGain, conditionValue: number = 0, conditionHeightened: number = 0, conditionChoice: string = "", conditionSpellCastingAbility: string = "") {
        let value = 0;
        try {
            //we eval the effect value by sending this effect gain to get_SimpleEffects() and receive the resulting effect.
            let effects = this.effectsService.get_SimpleEffects(this.get_Character(), this, { effects: [effectGain], value: conditionValue, heightened: conditionHeightened, choice: conditionChoice, spellCastingAbility: conditionSpellCastingAbility });
            if (effects.length) {
                let effect = effects[0];
                if (effect?.value != "0" && (parseInt(effect.value) || parseFloat(effect.value))) {
                    //I don't understand why this is done. I guess we don't want floats, but why not simply take the int?
                    if (parseFloat(effect.value) == parseInt(effect.value)) {
                        value = parseInt(effect.value);
                    }
                }
            } else {
                value = 0;
            }
        } catch (error) {
            value = 0;
        }
        switch (effectGain.affected) {
            case "Focus Points":
                (creature as Character).class.focusPoints += value;
                this.get_AppliedConditions(creature, "Hero's Defiance Cooldown").forEach(gain => {
                    this.remove_Condition(creature, gain);
                    this.set_ToChange(creature.type, "conditions");
                });
                this.set_ToChange(creature.type, "spellbook");
                break;
            case "Temporary HP":
                //When you get temporary HP, some things to process:
                //- If you already have temporary HP, add this amount to the selection. The player needs to choose one amount; they are not cumulative.
                //- If you are setting temporary HP manually, or if the current amount is 0, skip the selection and remove all the other options.
                //- If you are losing temporary HP, lose only those that come from the same source.
                //-- If that's the current effective amount, remove all other options (if you are "using" your effective temporary HP, we assume that you have made the choice for this amount). 
                //--- If the current amount is 0 after loss, reset the temporary HP.
                //-- Remove it if it's not the effective amount.
                if (value > 0) {
                    if (effectGain.source == "Manual") {
                        creature.health.temporaryHP[0] = { amount: value, source: effectGain.source, sourceId: "" };
                        creature.health.temporaryHP.length = 1;
                    } else if (creature.health.temporaryHP[0].amount == 0) {
                        creature.health.temporaryHP[0] = { amount: value, source: effectGain.source, sourceId: effectGain.sourceId };
                        creature.health.temporaryHP.length = 1;
                    } else {
                        creature.health.temporaryHP.push({ amount: value, source: effectGain.source, sourceId: effectGain.sourceId });
                    }
                } else {
                    let targetTempHPSet = creature.health.temporaryHP.find(tempHPSet => ((tempHPSet.source == "Manual") && (effectGain.source == "Manual")) || tempHPSet.sourceId == effectGain.sourceId)
                    if (targetTempHPSet) {
                        targetTempHPSet.amount += value;
                        if (targetTempHPSet === creature.health.temporaryHP[0]) {
                            creature.health.temporaryHP.length = 1;
                            if (targetTempHPSet.amount <= 0) {
                                creature.health.temporaryHP[0] = { amount: 0, source: "", sourceId: "" };
                            }
                        } else {
                            if (targetTempHPSet.amount <= 0) {
                                creature.health.temporaryHP.splice(creature.health.temporaryHP.indexOf(targetTempHPSet), 1);
                            }
                        }
                    }
                }
                this.set_ToChange(creature.type, "health");
                break;
            case "HP":
                if (value > 0) {
                    creature.health.heal(creature, this, this.effectsService, value, true)
                } else if (value < 0) {
                    creature.health.takeDamage(creature, this, this.effectsService, -value, false)
                }
                this.set_ToChange(creature.type, "health");
                break;
            case "Languages":
                let languages = (creature as Character).class.languages;
                if (languages.filter(language => language == effectGain.value).length == 0) {
                    languages.push(effectGain.value);
                }
                this.set_ToChange(creature.type, "general");
                this.set_ToChange(creature.type, "charactersheet");
                break;
            case "Raise Shield":
                let shield = this.get_Character().inventories[0].shields.find(shield => shield.equipped);
                if (shield) {
                    if (value > 0) {
                        shield.raised = true;
                    } else {
                        shield.raised = false;
                    }
                    this.set_ToChange(creature.type, "defense");
                    this.set_ToChange(creature.type, "effects");
                }
                break;
        }
    }

    have_Trait(object: any, traitName: string) {
        return this.traitsService.have_Trait(this, object, traitName);
    }

    get_Abilities(name: string = "") {
        return this.abilitiesService.get_Abilities(name)
    }

    get_Skills(creature: Character | AnimalCompanion | Familiar, name: string = "", type: string = "", locked: boolean = undefined) {
        return this.skillsService.get_Skills(creature.customSkills, name, type, locked)
    }

    get_Feats(name: string = "", type: string = "") {
        return this.featsService.get_Feats(this.get_Character().customFeats, name, type);
    }

    get_Features(name: string = "") {
        return this.featsService.get_Features(name);
    }

    get_FeatsAndFeatures(name: string = "", type: string = "", includeSubTypes: boolean = false) {
        return this.featsService.get_All(this.get_Character().customFeats, name, type, includeSubTypes);
    }

    get_Health(creature: Character | AnimalCompanion | Familiar) {
        return creature.health;
    }

    get_AnimalCompanionLevels() {
        return this.animalCompanionsService.get_CompanionLevels();
    }

    process_Feat(creature: Character | Familiar, featName: string, choice: FeatChoice, level: Level, taken: boolean) {
        this.featsService.process_Feat(creature, this, featName, choice, level, taken);
    }

    get_FeatsShowingOn(objectName: string = "all") {
        return this.get_FeatsAndFeatures().filter(feat =>
            feat.hints.find(hint =>
                hint.showon.split(",").find(showon => 
                    objectName.toLowerCase() == "all" ||
                    showon.trim().toLowerCase() == objectName.toLowerCase() ||
                    (
                        objectName.toLowerCase().includes("lore") &&
                        showon.trim().toLowerCase() == "lore"
                    )
                )
            ) && feat.have(this.get_Character(), this, this.get_Character().level)
        )
    }

    get_CompanionShowingOn(objectName: string = "all") {
        //Get showon elements from Companion Ancestry and Specialization
        return []
            .concat(
                [this.get_Companion().class.ancestry]
                .filter(ancestry => 
                    ancestry.hints
                    .find(hint => 
                        hint.showon.split(",")
                        .find(showon => 
                            objectName == "all" ||
                            showon.trim().toLowerCase() == objectName.toLowerCase()
                        )
                    )
                )
            )
            .concat(
                ...this.get_Companion().class.specializations
                .filter(spec =>
                    spec.hints
                    .find(hint => 
                        hint.showon.split(",")
                        .find(showon => 
                            objectName == "all" ||
                            showon.trim().toLowerCase() == objectName.toLowerCase()
                        )
                    )
                )
            )
            //Return any feats that include e.g. Companion:Athletics
            .concat(
                ...this.get_FeatsShowingOn("Companion:" + objectName)
            )
    }

    get_FamiliarShowingOn(objectName: string = "all") {
        //Get showon elements from Familiar Abilities
        return this.familiarsService.get_FamiliarAbilities().filter(feat =>
            feat.hints.find(hint =>
                hint.showon.split(",").find(showon => 
                    objectName.toLowerCase() == "all" ||
                    showon.trim().toLowerCase() == objectName.toLowerCase() ||
                    (
                        objectName.toLowerCase().includes("lore") &&
                        showon.trim().toLowerCase() == "lore"
                    )
                )
            ) && feat.have(this.get_Familiar(), this)
            //Return any feats that include e.g. Companion:Athletics
        ).concat(this.get_FeatsShowingOn("Familiar:" + objectName))
    }

    get_ConditionsShowingOn(creature: Character | AnimalCompanion | Familiar, objectName: string = "all") {
        return this.get_AppliedConditions(creature)
        .filter(conditionGain => conditionGain.apply)
        .map(conditionGain => this.get_Conditions(conditionGain.name)[0])
        .filter(condition =>
            condition?.hints.find(hint => 
                hint.showon.split(",").find(showon => 
                    objectName.trim().toLowerCase() == "all" ||
                    showon.trim().toLowerCase() == objectName.toLowerCase() ||
                    (
                        objectName.toLowerCase().includes("lore") &&
                        showon.trim().toLowerCase() == "lore"
                    )
                )
            )
        )
    }

    get_OwnedActivities(creature: Character | AnimalCompanion | Familiar, levelNumber: number = creature.level, all: boolean = false) {
        let activities: (ActivityGain | ItemActivity)[] = []
        if (!this.still_loading()) {
            if (creature.type == "Character") {
                activities.push(...(creature as Character).class.activities.filter(gain => gain.level <= levelNumber));
            }
            if (creature.type == "Companion" && creature.class.ancestry.name) {
                activities.push(...(creature as AnimalCompanion).class.ancestry.activities.filter(gain => gain.level <= levelNumber));
            }
            this.get_AppliedConditions(creature, "", "", true).filter(gain => gain.apply).forEach(gain => {
                activities.push(...this.get_Conditions(gain.name)[0]?.gainActivities)
            });
            //With the all parameter, get all activities of all items regardless of whether they are equipped or invested or slotted.
            // This is used for ticking down cooldowns.
            if (all) {
                creature.inventories.forEach(inv => {
                    inv.allEquipment().forEach(item => {
                        if (item.gainActivities.length) {
                            activities.push(...item.gainActivities);
                        }
                        if (item.activities.length) {
                            activities.push(...item.activities);
                        }
                        //Get activities from runes
                        if (item.propertyRunes) {
                            item.propertyRunes.filter(rune => rune.activities.length).forEach(rune => {
                                activities.push(...rune.activities);
                            });
                        }
                        //Get activities from runes
                        if (item.bladeAllyRunes) {
                            item.bladeAllyRunes.filter(rune => rune.activities.length).forEach(rune => {
                                activities.push(...rune.activities);
                            });
                        }
                        //Get activities from Oils emulating runes
                        if (item.oilsApplied) {
                            item.oilsApplied.filter(oil => oil.runeEffect && oil.runeEffect.activities).forEach(oil => {
                                activities.push(...oil.runeEffect.activities);
                            });
                        }
                        //Get activities from slotted Aeon Stones
                        if ((item as WornItem).aeonStones) {
                            (item as WornItem).aeonStones.filter(stone => stone.activities.length).forEach(stone => {
                                activities.push(...stone.activities);
                            })
                        }
                    })
                    inv.allRunes().forEach(rune => {
                        if (rune.activities.length) {
                            activities.push(...rune.activities);
                        }
                    })
                })
            } else {
                //Without the all parameter, get activities only from equipped and invested items and their slotted items.
                creature.inventories[0].allEquipment()
                    .filter(item =>
                        (item.equippable ? item.equipped : true) &&
                        (item.can_Invest() ? item.invested : true) &&
                        !item.broken
                    ).forEach((item: Equipment) => {
                        if (item.gainActivities.length) {
                            activities.push(...item.gainActivities);
                        }
                        //DO NOT get resonant activities at this point
                        if (item.activities.length) {
                            activities.push(...item.activities.filter(activity => !activity.resonant || all));
                        }
                        //Get activities from runes
                        if (item.propertyRunes) {
                            item.propertyRunes.filter(rune => rune.activities.length).forEach(rune => {
                                activities.push(...rune.activities);
                            });
                        }
                        //Get activities from runes
                        if (item.bladeAllyRunes && item["bladeAlly"]) {
                            item.bladeAllyRunes.filter(rune => rune.activities.length).forEach(rune => {
                                activities.push(...rune.activities);
                            });
                        }
                        //Get activities from Oils emulating runes
                        if (item.oilsApplied) {
                            item.oilsApplied.filter(oil => oil.runeEffect && oil.runeEffect.activities).forEach(oil => {
                                activities.push(...oil.runeEffect.activities);
                            });
                        }
                        //Get activities from slotted Aeon Stones, including resonant activities
                        if ((item as WornItem).aeonStones) {
                            (item as WornItem).aeonStones.filter(stone => stone.activities.length).forEach(stone => {
                                activities.push(...stone.activities);
                            })
                        }
                    })
            }
        }
        return activities.sort(function (a, b) {
            if (a.name > b.name) {
                return 1;
            }
            if (a.name < b.name) {
                return -1;
            }
            return 0;
        })
    }

    get_ActivitiesShowingOn(creature: Character | AnimalCompanion | Familiar, objectName: string = "all") {
        return this.get_OwnedActivities(creature)
            //Conflate ActivityGains and their respective Activities into one object...
            .map(gain => gain.constructor == ItemActivity ? [gain, gain] : [gain, this.activitiesService.get_Activities(gain.name)[0]])
            //...so that we can find the activities where the gain is active or the activity doesn't need to be toggled...
            .filter((gainAndActivity: [ActivityGain|ItemActivity, Activity]) => gainAndActivity[1] && (gainAndActivity[0].active || !gainAndActivity[1].toggle))
            //...and then keep only the activities.
            .map((gainAndActivity: [ActivityGain|ItemActivity, Activity]) => gainAndActivity[1])
            .filter(activity =>
                activity?.hints.find(hint => 
                    hint.showon.split(",").find(showon => 
                        objectName.trim().toLowerCase() == "all" ||
                        showon.trim().toLowerCase() == objectName.toLowerCase() ||
                        (
                            objectName.toLowerCase().includes("lore") &&
                            showon.trim().toLowerCase() == "lore"
                        )
                    )
                )
            )
    }

    get_ItemsShowingOn(creature: Character | AnimalCompanion | Familiar, objectName: string = "all") {
        let returnedItems: Item[] = [];
        //Prepare function to add items whose hints match the objectName.
        function get_Hint(item: Equipment | Oil | WornItem | ArmorRune) {
            if (item.hints
                .find(hint => 
                    hint.showon.split(",").find(showon => 
                        objectName.trim().toLowerCase() == "all" ||
                        showon.trim().toLowerCase() == objectName.toLowerCase() ||
                        (
                            objectName.toLowerCase().includes("lore") &&
                            showon.trim().toLowerCase() == "lore"
                        )
                    )
                )
            ) {
                returnedItems.push(item);
            }
        }
        creature.inventories.forEach(inventory => {
            inventory.allEquipment().filter(item => (item.equippable ? item.equipped : true) && item.amount && !item.broken && (item.can_Invest() ? item.invested : true)).forEach(item => {
                get_Hint(item);
                item.oilsApplied.forEach(oil => {
                    get_Hint(oil);
                });
                if ((item as WornItem).aeonStones) {
                    (item as WornItem).aeonStones.forEach(stone => {
                        get_Hint(stone);
                    });
                }
                if (item.moddable == "armor" && (item as Equipment).propertyRunes) {
                    (item as Equipment).propertyRunes.forEach(rune => {
                        get_Hint(rune as ArmorRune);
                    });
                }
            });
        });
        return returnedItems;
    }

    get_ArmorSpecializationsShowingOn(creature: Character | AnimalCompanion | Familiar, objectName: string = "all") {
        if (creature.type == "Character") {
            return creature.inventories[0].armors.find(armor => armor.equipped).get_ArmorSpecialization(creature, this)
                .filter(spec => 
                    spec?.hints
                    .find(hint => 
                        hint.showon.split(",")
                        .find(showon => 
                            objectName.trim().toLowerCase() == "all" ||
                            showon.trim().toLowerCase() == objectName.toLowerCase() ||
                            (
                                objectName.toLowerCase().includes("lore") &&
                                showon.trim().toLowerCase() == "lore"
                            )
                        )
                    )
                )
        } else {
            return [];
        }
    }

    get_MaxFocusPoints() {
        let focusPoints: number = 0;
        this.effectsService.get_AbsolutesOnThis(this.get_Character(), "Focus Pool").forEach(effect => {
            focusPoints = parseInt(effect.setValue);
        })
        this.effectsService.get_RelativesOnThis(this.get_Character(), "Focus Pool").forEach(effect => {
            focusPoints += parseInt(effect.value);
        })
        return Math.min(focusPoints, 3);
    }

    get_AC() {
        return this.defenseService.get_AC();
    }

    initialize_AnimalCompanion() {
        let character = this.get_Character();
        if (character.class.animalCompanion) {
            character.class.animalCompanion = Object.assign(new AnimalCompanion(), character.class.animalCompanion);
            character.class.animalCompanion = this.reassign(character.class.animalCompanion);
            character.class.animalCompanion.class.reset_levels(this);
            character.class.animalCompanion.set_Level(this);
            this.equip_BasicItems(character.class.animalCompanion);
            this.set_ToChange("Companion", "all");
        }
    }

    cleanup_Familiar() {
        this.get_Familiar().abilities.feats.forEach(gain => {
            this.get_Character().take_Feat(this.get_Familiar(), this, gain.name, false, this.get_Familiar().abilities, undefined);
        })
    }

    initialize_Familiar() {
        let character = this.get_Character();
        if (character.class.familiar) {
            character.class.familiar = Object.assign(new Familiar(), character.class.familiar);
            character.class.familiar = this.reassign(character.class.familiar);
            this.set_ToChange("Familiar", "all");
        }
    }

    initialize(id: string) {
        this.set_Changed("top-bar");
        this.loading = true;
        this.traitsService.initialize();
        this.abilitiesService.initialize();
        this.activitiesService.initialize();
        this.featsService.initialize();
        this.historyService.initialize();
        this.classesService.initialize();
        this.conditionsService.initialize();
        this.spellsService.initialize();
        this.skillsService.initialize()
        this.itemsService.initialize();
        this.effectsService.initialize(this);
        this.deitiesService.initialize();
        this.animalCompanionsService.initialize();
        this.familiarsService.initialize();
        this.savegameService.initialize(this);
        if (id) {
            this.me = new Character();
            this.load_CharacterFromDB(id)
                .subscribe((results: string[]) => {
                    this.loader = results;
                    this.finish_loading()
                }, (error) => {
                    console.log('Error loading character from database: ' + error.message);
                });
        } else {
            this.me = new Character();
            this.finish_loading();
        }
    }

    load_CharacterFromDB(id: string): Observable<string[]> {
        return this.savegameService.load_CharacterFromDB(id);
    }

    delete_Character(savegame: Savegame) {
        this.savegameService.delete_CharacterFromDB(savegame).subscribe((results) => {
            console.log("Deleted " + (savegame.name || "character") + " from database.");
            this.savegameService.initialize(this);
        }, (error) => {
            console.log('Error deleting from database: ' + error.message);
        });
    }

    reassign(object: any) {
        return this.savegameService.reassign(object);
    }

    finish_loading() {
        if (this.loader) {
            this.me = Object.assign(new Character(), JSON.parse(JSON.stringify(this.loader)));
            this.loader = [];
            this.finalize_Character();
        }
    }

    finalize_Character() {
        if (this.itemsService.still_loading() || this.animalCompanionsService.still_loading()) {
            setTimeout(() => {
                this.finalize_Character();
            }, 500)
        } else {
            //Use this.me here instead of this.get_Character() because we're still_loading()
            this.me = this.savegameService.load_Character(this.me, this.itemsService, this.classesService, this.historyService, this.animalCompanionsService)
            if (this.loading) { this.loading = false; }
            this.grant_BasicItems();
            this.characterChanged$ = this.changed.asObservable();
            this.viewChanged$ = this.viewChanged.asObservable();
            this.trigger_FinalChange();
        }
    }

    trigger_FinalChange() {
        if (
            this.traitsService.still_loading() ||
            this.featsService.still_loading() ||
            this.historyService.still_loading() ||
            this.classesService.still_loading() ||
            this.conditionsService.still_loading() ||
            this.spellsService.still_loading() ||
            this.itemsService.still_loading()
        ) {
            setTimeout(() => {
                this.trigger_FinalChange();
            }, 500)
        } else {
            //Update everything once.
            this.set_Changed();
            this.set_ToChange("Character", "effects");
            this.process_ToChange();
        }
    }

    save_Character() {
        this.savegameService.save_Character(this.get_Character(), this.itemsService, this.classesService, this.historyService, this.animalCompanionsService).subscribe((result) => {
            if (result["lastErrorObject"] && result["lastErrorObject"].updatedExisting) {
                console.log("Saved " + (this.get_Character().name || "character") + " to database.");
            } else {
                console.log("Created " + (this.get_Character().name || "character") + " on database.");
            }
            this.savegameService.initialize(this);
        }, (error) => {
            console.log('Error saving to database: ' + error.message);
        });

    }

}