import colorString from 'color-string';

import { ColorReplaceOptions, ColorStringObject } from './types';

export const getOptions = (options: ColorReplaceOptions) => {
	const defaults: ColorReplaceOptions = {
		stringType: 'string',
		includeColorKeyword: true,
		hexAlphaSupport: false,
	};

	return { ...defaults, ...options };
};

export const getShortHex = (hex: string) => {
	const hexValue = hex.replace(/^#/, '');
	const reduced = hexValue
		.toUpperCase()
		.split('')
		.reduce((acc: string, curr: string, index: number) => {
			if (index % 2 && acc.substr(-1) === curr) {
				return acc;
			}

			return acc + curr;
		});

	return reduced.length === hexValue.length / 2 ? `#${reduced}` : hex;
};

export const readyRegexString = (string: string) => {
	return string.replace(/(?<!\\)(\(|\))/g, '\\$1');
};

export const addCheckInCSSValue = (regexString: string) => {
	return `(?<=:[^;]*?)${regexString}(?=[^;]*?;)`;
};

export const addCheckInHTMLValue = (regexString: string) => {
	return `(?<=style="[^"]*?|<style>.|\s*?)${addCheckInCSSValue(regexString)}(?=[^"]*?"|.|\s*?<\/style>)`;
};

export const getStringTypeRegex = (
	regexString: string,
	stringType: ColorReplaceOptions['stringType'],
) => {
	if (stringType === 'css') {
		return addCheckInCSSValue(regexString);
	}

	if (stringType === 'html') {
		return addCheckInHTMLValue(regexString);
	}

	return regexString;
};

export const isAlphaColor = (color: string): boolean => {
	return !!color.match(/^(rgb|hsl)a\(/i);
};

export const convertType = (
	colorType: string,
	color: string,
	options: ColorReplaceOptions | undefined,
) => {
	const colorObj: ColorStringObject = colorString.get(color);

	if (colorType === 'hex' && options && !options.hexAlphaSupport && colorObj.value[3] !== 1) {
		return null;
	}

	return colorString.to[colorType]
		? colorString.to[colorType](colorObj.value)
		: color;
};
