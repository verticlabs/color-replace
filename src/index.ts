import colorString from 'color-string';

import {
	convertType,
	getOptions,
	getShortHex,
	getStringTypeRegex,
	isAlphaColor,
} from './helpers';

import {
	ColorReplaceOptions,
	RegexObject,
} from './types';

// An array of all supported color types
const colorTypes:string[] = ['hex', 'rgb', 'hsl'];

const getColorVariants = (
	color: string,
	options: ColorReplaceOptions | undefined = undefined,
	isReplacementVariants: boolean = true,
): { [key: string]: string } => {
	// Get converted values for all types
	const colorsConverted: { [key: string]: string } = {};
	colorTypes.forEach((colorType) => {
		let converted = convertType(colorType, color, options);

		// Set hex value as rgb for alpha colors when hexAlphaSupport is false
		if (!converted && colorType === 'hex' && options && !options.hexAlphaSupport) {
			converted = convertType('rgb', color, options);
		}

		if (!converted) return;

		colorsConverted[colorType] = converted;

		// Try to get short hex version
		if (isReplacementVariants && colorType === 'hex') {
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
	const { newColors } = regex;

	// Get all match types available in the group
	// If there are more groups that in the colorTypes array, then a keyword is
	// also preset, which we'll name hex as that is the color we'll fallback to
	const groupColorTypes = regex.groups > colorTypes.length ? ['hex', ...colorTypes] : colorTypes;

	// Locate which color type the current match is
	const matchType = groupColorTypes[matchIndex];

	// Get the new color replacement
	if (newColors && newColors[matchType]) {
		replacement = newColors[matchType];
	}

	// If we couldn't find a specific replacement match by type
	if (newColors && replacement === match) {
		// Find the first color with a value that can be used
		const replacementType = Object.keys(newColors).find((colorKey) => {
			return !!newColors[colorKey];
		});

		if (replacementType) {
			replacement = newColors[replacementType];
		}
	}

	if (replacement !== match) {
		// Checks if the current match is an alpha color (rgba or hsla)
		if (isAlphaColor(match) && !regex.replaceAlpha) replacement = replacement.replace(/\(/, 'a(').replace(/\)$/, '');
	}

	return replacement;
};

const getColorRegex = (
	color: string,
	options: ColorReplaceOptions = {},
	addTypeSpecificRegex: boolean = false,
): RegexObject => {
	const opts = { ...options, hexAlphaSupport: true };
	const isStyling = opts.stringType === 'css' || opts.stringType === 'html';

	// Get converted values for all types
	const typesConverted: { [key: string]: string } = getColorVariants(color, opts, false);
	const colors: string[] = [];

	if (opts.includeColorKeyword) {
		// Get color as keyword i.e. "white" or "blue"
		const colorKeyword: string = convertType('keyword', color, opts);

		// If colorString could find a keyword that matched the color value
		if (colorKeyword) {
			// If it's a styling string then don't replace keywords in parentheses (in url(...) stylings)
			colors.push(isStyling ? `(${colorKeyword}(?![^\\(]*\\)))` : `(${colorKeyword})`);
		}
	}

	colorTypes.forEach((colorType) => {
		let colorValue: string = typesConverted[colorType];
		if (!colorValue) return;

		// Making a regex colorValue for black and white hsl values
		// as they can be styled with any hue and saturation value
		if (colorType === 'hsl' && colorValue.match(/hsla?\([\d\s]*,[\d\s%]*,\s?(0|100)%/gi)) {
			colorValue = colorValue.replace(/(?<=hsla?\()[\d\s]*,\s?[\d\s%]*/i, '\\d{1,3}, \\d{1,3}%');
		}

		let groupValues: string[] = [colorValue];

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
				// If the colorValue isn't already an alpha color, then add
				// an extra value to look for alpha colors (rgba or hsla)
				if (!isAlphaColor(colorValue)) {
					const rgbaValue: string = colorValue
						.replace(/^(rgb|hsl)\(/, '$1a(').replace(/\)$/, '');
					groupValues.push(rgbaValue);
				}
				break;

			default:
				break;
		}

		groupValues = groupValues.map((groupValue) => {
			const newGroupValue = groupValue.replace(/(\(|\))/g, '\\$1').replace(/,\s+/g, '[\\s]*,[\\s]*');
			return colorType === 'hex' ? `${newGroupValue}(?=[\\s;])` : newGroupValue;
		});

		// Building regex group for specific color type
		// In here we escape all parantheses and allow spaces before
		// and after commas in rgb or hsl values.
		colors.push(`(${groupValues.join('|')})`);
	});

	// Combining all color type regex groups into one regex
	// The regex is set to only match colors between colon and semicolon characters,
	// so it only checks in CSS values and not properties or selectors.
	return {
		color,
		regex: addTypeSpecificRegex ? getStringTypeRegex(colors.join('|'), opts.stringType) : colors.join('|'),
		groups: colors.length,
		replaceAlpha: isAlphaColor(color), // if the original color is an alpha color, then we'll replace it all
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
	const colorVariants: { [key: string]: string } = getColorVariants(replacement, opts, true);
	if (!colorVariants) return newString;

	const regex: RegexObject = getColorRegex(color, opts, true);
	if (!regex.regex) return newString;

	regex.newColors = colorVariants;

	newString = newString.replace(new RegExp(regex.regex, 'gim'), (match, regexGroup, ...groups) => {
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
		const colorVariants: { [key: string]: string } = getColorVariants(colorMap[color], opts, true);

		allRegex.push({
			...getColorRegex(color, opts),
			newColors: colorVariants,
		});
	});

	// Combine regexes into one big regex
	const combinedRegexString = allRegex.filter(reg => reg.regex).map(reg => reg.regex).join('|');
	const combinedRegex = new RegExp(getStringTypeRegex(combinedRegexString, opts.stringType), 'gim');

	newString = string.replace(combinedRegex, (match, regexGroup, ...groups) => {
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
