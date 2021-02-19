import colorString from 'color-string';

import {
	addCheckInCSSValue,
	convertType,
	getOptions,
	getShortHex,
} from './helpers';

import {
	ColorReplaceOptions,
	ColorStringObject,
	RegexObject,
} from './types';

// An array of all supported color types
const colorTypes:string[] = ['hex', 'rgb', 'hsl'];

const getColorVariants = (color: string): { [key: string]: string } | undefined => {
	const parsed: ColorStringObject = colorString.get(color);
	if (!parsed) return {};

	// Get converted values for all types
	const colorsConverted: { [key: string]: string } = {};
	colorTypes.forEach((colorType) => {
		colorsConverted[colorType] = colorString.to[colorType](convertType(colorType, parsed));

		// Try to get short hex version
		if (colorType === 'hex') {
			colorsConverted[colorType] = getShortHex(colorsConverted[colorType]);
		}
	});

	return colorsConverted;
};

const getRegexMatchReplacement = (
	match: string,
	matchIndex: number,
	regex: RegexObject,
): string => {
	let replacement: string = match;

	// Get all match types available in the group
	// If there are more groups that in the colorTypes array, then a keyword is
	// also preset, which we'll name hex as that is the color we'll fallback to
	const groupColorTypes = regex.groups > colorTypes.length ? ['hex', ...colorTypes] : colorTypes;

	// Locate which color type the current match is
	const matchType = groupColorTypes[matchIndex];

	// Get the new color replacement
	if (regex.newColors && regex.newColors[matchType]) {
		replacement = regex.newColors[matchType];

		// Checks if the current match is an alpha color (rgba or hsla)
		const isAlpha = match.indexOf('a(') > 0;
		if (isAlpha) replacement = replacement.replace(/\(/, 'a(').replace(/\)$/, '');
	}

	return replacement;
};

const getColorRegex = (
	color: string,
	options: ColorReplaceOptions = {},
	checkInCSSValue: boolean = false,
): RegexObject => {
	const isCSS = options.stringType === 'css';
	const parsed: ColorStringObject = colorString.get(color);

	// If the color is an invalid color string
	if (!parsed) return { color, groups: 0 };

	// Get value without alpha if includeAlphas is set to true
	if (options.includeAlphas) {
		parsed.value = parsed.value.slice(0, 3);
	}

	// Get converted values for all types
	const typesConverted: { [key: string]: number[] } = {};
	colorTypes.forEach((colorType) => {
		typesConverted[colorType] = convertType(colorType, parsed);
	});

	const colors: string[] = [];

	if (options.includeColorKeyword) {
		// Get color as keyword i.e. "white" or "blue"
		const colorKeyword: string = colorString.to.keyword(parsed.value);

		// If colorString could find a keyword that matched the color value
		if (colorKeyword) {
			colors.push(isCSS ? `(?<=\\s|:)(${colorKeyword})(?=\\s|;)` : colorKeyword);
		}
	}

	colorTypes.forEach((colorType) => {
		const converted: number[] = typesConverted[colorType];
		let colorValue: string = colorString.to[colorType](converted);

		// Making a regex colorValue for black and white hsl values
		// as they can be styled with any hue and saturation value
		if (colorType === 'hsl' && (converted[2] === 100 || converted[2] === 0)) {
			colorValue = colorValue.replace(/(?<=hsl\()[\d\s,%]*(?=,\s?(10)?0%\))/i, '\\d{1,3}, \\d{1,3}%');
		}

		const groupValues: string[] = [colorValue];

		// Including extra checks for the specific color type
		switch (colorType) {
			case 'hex':
				// Also checking for short HEX values
				const shortHex: string = getShortHex(colorValue);
				if (shortHex && shortHex !== colorValue) {
					groupValues.push(shortHex);
				}
				break;

			case 'rgb':
			case 'hsl':
				// If includeAlphas is enabled then we'll add a
				if (options.includeAlphas) {
					const rgbaValue: string = colorValue
						.replace(/^(rgb|hsl)\(/, '$1a(').replace(/\)$/, '');
					groupValues.push(rgbaValue);
				}
				break;

			default:
				break;
		}

		// Building regex group for specific color type
		// In here we escape all parantheses and allow spaces before
		// and after commas in rgb or hsl values.
		colors.push(`(${groupValues.join('|').replace(/(\(|\))/g, '\\$1').replace(/,\s+/g, '[\\s]*,[\\s]*')})`);
	});

	// Combining all color type regex groups into one regex
	// The regex is set to only match colors between colon and semicolon characters,
	// so it only checks in CSS values and not properties or selectors.
	return {
		color,
		regex: checkInCSSValue ? addCheckInCSSValue(colors.join('|')) : colors.join('|'),
		groups: colors.length,
	};
};

export const colorReplace = (
	color: string,
	replacement: string,
	string: string,
	options: ColorReplaceOptions = {},
) => {
	const opts = getOptions(options);
	let newString:string = string;

	// Get all variants of the replacement color
	const colorVariants: { [key: string]: string } | undefined = getColorVariants(replacement);
	if (!colorVariants) return newString;

	const regex: RegexObject = getColorRegex(color, opts, true);
	if (!regex.regex) return newString;

	newString = newString.replace(regex.regex, (match, ...groups) => {
		// Getting the match index in the current group
		const matchIndex = groups.indexOf(match);

		// Getting placement value
		return getRegexMatchReplacement(match, matchIndex, regex);
	});

	return newString;
};

export const colorReplaceMap = (
	colorMap: { [key: string]: string },
	string: string,
	options: ColorReplaceOptions = {},
) => {
	const opts = getOptions(options);
	let newString: string = string;

	const allRegex: RegexObject[] = [];

	// Loop through all colors in the colorMap and replace them in the string
	const colors: string[] = Object.keys(colorMap);
	colors.forEach((color: string) => {
		// Get all variants of the replacement color
		const colorVariants: { [key: string]: string } | undefined = getColorVariants(colorMap[color]);

		allRegex.push({ ...getColorRegex(color, opts), newColors: colorVariants });
	});

	// Combine regexes into one big regex
	const combinedRegexString = allRegex.filter(reg => reg.regex).map(reg => reg.regex).join('|');
	const combinedRegex = new RegExp(addCheckInCSSValue(combinedRegexString), 'gim');

	newString = string.replace(combinedRegex, (match, ...groups) => {
		let replaceString: string = match;

		const groupIndex: number = groups.indexOf(match);
		let counter = 0;

		// Loop through all regexes and get the replacement value from the
		// first regex that matches the groupIndex
		allRegex.some(reg => {
			const prevCount = counter;
			counter += reg.groups;

			// Check if the match is inside the current color regex group
			const inGroup = groupIndex >= prevCount && groupIndex < counter;
			if (!inGroup) return false;

			// Getting the match index in the current group
			const indexInGroup = groupIndex - prevCount;

			// Getting replacement value
			replaceString = getRegexMatchReplacement(replaceString, indexInGroup, reg);

			return inGroup;
		});

		return replaceString;
	});

	return newString;
};
