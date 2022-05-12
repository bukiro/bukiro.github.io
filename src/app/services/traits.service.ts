import { Injectable } from '@angular/core';
import { Trait } from 'src/app/classes/Trait';
import * as json_traits from 'src/assets/json/traits';
import { Creature } from 'src/app/classes/Creature';
import { ExtensionsService } from 'src/app/services/extensions.service';

@Injectable({
    providedIn: 'root',
})
export class TraitsService {

    private _traits: Array<Trait> = [];
    private _loading = false;
    private readonly _traitsMap = new Map<string, Trait>();

    constructor(
        private readonly _extensionsService: ExtensionsService,
    ) { }

    public getTraitFromName(name: string): Trait {
        //Returns a named trait from the map.
        return this._traitsMap.get(name.toLowerCase()) || this._getReplacementTrait(name);
    }

    public getTraits(traitName = ''): Array<Trait> {
        if (!this.stillLoading()) {
            //If only a name is given, try to find a feat by that name in the index map. This should be much quicker.
            //If no trait is found with that exact name, continue the search, considering composite trait names.
            if (traitName) {
                const trait = this.getTraitFromName(traitName);

                if (trait?.name == traitName) {
                    return [trait];
                }
            }

            //Some trait instances have information after the trait name, so we allow traits that are included in the name as long as they have the dynamic attribute.
            const traits = this._traits
                .filter(trait =>
                    !traitName ||
                    trait.name == traitName ||
                    (
                        trait.dynamic &&
                        traitName.includes(`${ trait.name } `)
                    ),
                );

            if (traits.length) {
                return traits;
            }
        }

        return [this._getReplacementTrait()];
    }

    public getTraitsForThis(creature: Creature, name: string): Array<Trait> {
        if (!this.stillLoading()) {
            //Return all traits that are set to SHOW ON this named object and that are on any equipped equipment in your inventory
            //uses the haveOn() method of Trait that returns any equipment that has this trait
            return this._traits.filter(trait =>
                trait.hints.some(hint =>
                    hint.showon.split(',').some(showon =>
                        showon.trim().toLowerCase() == name.toLowerCase() ||
                        showon.trim().toLowerCase() == (`${ creature.type }:${ name }`).toLowerCase() ||
                        (
                            name.toLowerCase().includes('lore') &&
                            showon.trim().toLowerCase() == 'lore'
                        ),
                    ),
                )
                && !!trait.itemsWithThisTrait(creature).length,
            );
        } else {
            return [];
        }
    }

    public stillLoading(): boolean {
        return (this._loading);
    }

    public initialize(): void {
        //Initialize only once.
        if (!this._traits.length) {
            this._loading = true;
            this._loadTraits();
            this._traits.forEach(trait => {
                this._traitsMap.set(trait.name.toLowerCase(), trait);
            });
            this._loading = false;
        }
    }

    public reset(): void {
        this._traits.forEach(trait => {
            trait.hints?.forEach(hint => {
                hint.active = hint.active2 = hint.active3 = hint.active4 = hint.active5 = false;
            });
        });
    }

    private _loadTraits(): void {
        this._traits = [];

        const data = this._extensionsService.extend(json_traits, 'traits');

        Object.keys(data).forEach(key => {
            this._traits.push(...data[key].map((obj: Trait) => Object.assign(new Trait(), obj).recast()));
        });
        this._traits = this._extensionsService.cleanup_Duplicates(this._traits, 'name', 'traits') as Array<Trait>;
    }

    private _getReplacementTrait(name?: string): Trait {
        return Object.assign(new Trait(), { name: 'Trait not found', desc: `${ name ? name : 'The requested trait' } does not exist in the traits list.` });
    }

}
