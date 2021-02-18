import colorString from 'color-string';

import { convertType, getOptions, getShortHex } from './helpers';
import { ColorReplaceOptions, ColorStringObject } from './types';

const colorTypes:string[] = ['hex', 'rgb', 'hsl'];

export const colorReplace = (
	oldColor: string,
	newColor: string,
	string: string,
	options: ColorReplaceOptions = {},
) => {
	const opts = getOptions(options);
	let newString:string = string;

	const parsed:ColorStringObject = colorString.get(oldColor);
	const newColorParsed:ColorStringObject = colorString.get(newColor);

	// If the color is an invalid color string
	if (!parsed || !newColorParsed) return newString;

	// Get value without alpha if includeAlphas is set to true
	const value:number[] = opts.includeAlphas ? parsed.value.slice(0, 3) : parsed.value;
	const newColorValue:number[] = opts.includeAlphas ? newColorParsed.value.slice(0, 3) : newColorParsed.value;

	// Get color as keyword i.e. "white" or "blue"
	const colorKeyword:string = colorString.to.keyword(value);
	const colors:string[] = colorKeyword ? [`(?<=\\s|:)${colorKeyword}(?=\\s|;)`] : [];

	colorTypes.forEach((colorType) => {
		const converted = convertType(colorType, { model: parsed.model, value });

		let colorValue = colorString.to[colorType](converted);

		// Making a regex colorValue for black and white hsl values
		// as they can be styled with any hue and saturation value
		if (colorType === 'hsl' && (converted[2] === 100 || converted[2] === 0)) {
			colorValue = colorValue.replace(/(?<=hsl\()[\d\s,%]*(?=,\s?(10)?0%\))/i, '\\d{1,3}, \\d{1,3}%');
		}

		const groupValues = [colorValue];

		// Including extra checks for the specific color type
		switch (colorType) {
			case 'hex':
				// Also checking for short HEX values
				const shortHex = getShortHex(colorValue);
				if (shortHex && shortHex !== colorValue) {
					groupValues.push(shortHex);
				}
				break;

			case 'rgb':
			case 'hsl':
				// If includeAlphas is enabled then we'll add a
				if (opts.includeAlphas) {
					const rgbaValue = colorValue
						.replace(/^(rgb|hsl)\(/, '$1a(').replace(/\)$/, '');
					groupValues.push(rgbaValue);
				}
				break;

			default:
				break;
		}

		// Building regex group for specific color type
		colors.push(`(?<${colorType}>${groupValues.join('|').replace(/(\(|\))/g, '\\$1').replace(/,\s+/g, '(\\s+)?,(\\s+)?')})`);
	});

	// Combining all color type regex groups into one regex
	// The regex is set to only match colors between colon and semicolon characters,
	// so it only checks in CSS values and not properties or selectors.
	const regex = new RegExp(`(?<=:(.*?))(${colors.join('|')})(?=(.*?);)`, 'gim');

	newString = newString.replace(regex, (match, offset, preMatch, ...others) => {
		const isAlpha = match.indexOf('a(') > 0;
		const matchType = colorTypes.find((colorType, index) => {
			return !!others[index];
		}) || 'hex';
		const converted = convertType(matchType, { model: parsed.model, value: newColorValue });

		let replaceColor = colorString.to[matchType](converted);
		if (isAlpha) replaceColor = replaceColor.replace(/\(/, 'a(').replace(/\)$/, '');
		else if (!matchType || matchType === 'hex') replaceColor = getShortHex(replaceColor);

		return replaceColor;
	});

	return newString;
};

export const colorReplaceMap = (
	colorMap: { [key: string]: string },
	string: string,
	options: ColorReplaceOptions = {},
) => {
	const colors:Array<string> = Object.keys(colorMap);
	let newString:string = string;

	colors.forEach((color:string) => {
		newString = colorReplace(color, colorMap[color], newString, options);
	});

	return newString;
};
