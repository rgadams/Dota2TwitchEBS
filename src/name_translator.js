/**
 * This class helps match ability and item names that have a larger discrepancy than a simple regex expression can fix.
 * The DOTA2GSI doesnt always return names that are consistent with what is on the DOTA2 Wiki.
 */
const papa = require('papaparse');
const fs = require('fs');

module.exports = class NameTranslator {
    constructor() {
        this.correctedItemNames = new Map();
        this.correctedAbilityNames = new Map();

        const readCSV = async (filePath) => {
            const csvFile = fs.readFileSync(filePath)
            const csvData = csvFile.toString()  
            return new Promise(resolve => {
                papa.parse(csvData, {
                    delimiter: ', ',
                    header: true,
                    complete: (results) => {
                        console.log('Completed reading', results.data.length, 'records from', filePath); 
                        resolve(results.data);
                    }
                });
            });
        };

        readCSV('./src/resources/ability_name_translator.csv').then((result) => {
            result.forEach(ability => {
                this.correctedAbilityNames.set(ability['From'], ability['To'])
            });
        });

        readCSV('./src/resources/item_name_translator.csv').then((result) => {
            result.forEach(item => {
                this.correctedItemNames.set(item['From'], item['To'])
            });
        });
    }
    
    translateAbilityName(abilityName, heroName) {
        abilityName = abilityName.replace(heroName, '')
            .split("_")
            .map((str) => str.charAt(0).toUpperCase() + str.substring(1))
            .join(" ")
            .replace('Of', 'of')
            .replace('The', 'the')
            .trim();
        return this.correctedAbilityNames.get(abilityName) || abilityName;
    }

    translateItemName(itemName) {
        itemName = itemName.replace(/.*?_/, '')
            .split("_")
            .map((str) => str.charAt(0).toUpperCase() + str.substring(1))
            .join(" ")
            .trim()
            .replace(" Of ", " of ");
        return this.correctedItemNames.get(itemName) || itemName;
    }
}