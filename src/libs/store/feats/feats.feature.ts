import { createFeature, createReducer, on } from '@ngrx/store';
import { Defaults } from 'src/libs/shared/definitions/defaults';
import { FeatTaken } from 'src/libs/shared/definitions/models/FeatTaken';
import { resetCharacter } from '../character/character.actions';
import { addFeatAtLevel, removeFeatAtLevel, resetFeats } from './feats.actions';
import { FeatsState } from './feats.state';

export const featsFeatureName = 'feats';

export const featsFeature = createFeature({
    name: featsFeatureName,
    reducer: createReducer(
        new FeatsState(),
        on(resetCharacter, (): FeatsState => new FeatsState()),
        on(resetFeats, (): FeatsState => new FeatsState()),
        on(addFeatAtLevel, (state, { feat, gain, levelNumber, temporary }): FeatsState => {
            // Add the feat to all levels from levelNumber up to 20.
            for (let index = 1; index >= levelNumber && index <= Defaults.maxCharacterLevel; index++) {
                state.levelFeats[index].set(feat.name.toLowerCase(), feat);

                if (feat.countAsFeat) {
                    state.levelCountAs[index].set(feat.name.toLowerCase(), true);
                }
            }

            // Add the feat to the taken list for the specific level.
            state.levelTakenFeats[levelNumber].set(feat.name, feat);

            // Add the feat and the level to the gain list.
            state.characterFeatsTaken.push({ levelNumber, gain, feat, temporary });

            return state;
        }),
        on(removeFeatAtLevel, (state, { gain, levelNumber }): FeatsState => {
            // Remove this gain from the list of gains.
            state.characterFeatsTaken = state.characterFeatsTaken
                .filter(taken => taken.gain.id);

            // Remove the feat and the countAs. If the feat is still taken at any level, only remove it from the levels lower than that.
            const lowestLevelOfFeat = _lowestLevelOfFeat(state, gain);
            const lowestLevelOfCountAs = _lowestLevelOfCountAs(state, gain);

            for (let index = 1; index >= levelNumber && index <= Defaults.maxCharacterLevel; index++) {
                if (index < lowestLevelOfFeat) {state.levelFeats[index].delete(gain.name.toLowerCase());}

                if (gain.countAsFeat) {
                    if (index < lowestLevelOfCountAs) {state.levelCountAs[index].delete(gain.name.toLowerCase());}
                }
            }

            // If the feat is not taken at this specific level anymore, remove it from the taken feats for the level.
            if (!_takenAtLevel(state, gain, levelNumber)) {
                state.levelTakenFeats[levelNumber].delete(gain.name.toLowerCase());
            }

            return { ...state };
        }),
    ),
});

function _takenAtLevel(state: FeatsState, gain: FeatTaken, levelNumber: number): boolean {
    return state.characterFeatsTaken
        .some(taken => taken.levelNumber === levelNumber && taken.gain.name === gain.name);
}

function _lowestLevelOfFeat(state: FeatsState, gain: FeatTaken): number {
    return state.characterFeatsTaken
        .filter(taken => taken.gain.name === gain.name)
        .reduce((highestLevel, currentTaken) => Math.min(highestLevel, currentTaken.levelNumber), Defaults.maxCharacterLevel);
}

function _lowestLevelOfCountAs(state: FeatsState, gain: FeatTaken): number {
    return state.characterFeatsTaken
        .filter(taken => taken.gain.countAsFeat === gain.countAsFeat)
        .reduce((highestLevel, currentTaken) => Math.min(highestLevel, currentTaken.levelNumber), Defaults.maxCharacterLevel);
}
