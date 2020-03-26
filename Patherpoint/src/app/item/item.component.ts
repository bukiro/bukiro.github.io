import { Component, OnInit, Input } from '@angular/core';
import { Item } from '../Item';
import { Consumable } from '../Consumable';
import { TraitsService } from '../traits.service';
import { ActivitiesService } from '../activities.service';

@Component({
    selector: 'app-item',
    templateUrl: './item.component.html',
    styleUrls: ['./item.component.css']
})
export class ItemComponent implements OnInit {

    @Input()
    item;

    constructor(
        private traitsService: TraitsService,
        private activitiesService: ActivitiesService
    ) { }

    get_Traits(name: string = "") {
        return this.traitsService.get_Traits(name);
    }

    get_Price(item) {
        if (item.price) {
            if (item.price == 0) {
                return "";
            } else {
                let price: number = item.price;
                let priceString: string = "";
                if (price >= 100) {
                    priceString += Math.floor(price / 100)+"gp";
                    price %= 100;
                    if (price >= 10) {priceString += " ";}
                }
                if (price >= 10) {
                    priceString += Math.floor(price / 10)+"sp";
                    price %= 10;
                    if (price >= 1) {priceString += " ";}
                }
                if (price >= 1) {
                    priceString += price+"cp";
                }
                return priceString;
            }
        } else {
            return ""
        }
    }

    get_Activities(name: string = "") {
        return this.activitiesService.get_Activities(name);
    }

    get_Actions(item) {
        switch (item.actions) {
            case "Free":
                return "(Free Action)";
            case "Reaction":
                return "(Reaction)";
            case "1":
                return "(1 Action)";
            case "2":
                return "(2 Actions)";
            case "3":
                return "(3 Actions)";
            default:
                return "("+item.actions+")";
        }
    }

    ngOnInit() {
    }

}