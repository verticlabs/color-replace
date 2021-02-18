import convert from 'color-convert';

import { ColorReplaceOptions, ColorStringObject } from './types';

export const getOptions = (options: ColorReplaceOptions) => {
	const defaults: ColorReplaceOptions = {
		fromType: 'hex',
		toType: 'hex',
		includeAlphas: true,
	};

	return { ...defaults, ...options };
};

export const getShortHex = (hex: string) => {
	const reduced = hex
		.toUpperCase()
		.replace(/^#/, '')
		.split('')
		.reduce((acc: string, curr: string, index: number) => {
			if (index % 2 && acc.substr(-1) === curr) {
				return acc;
			}

			return acc + curr;
		});

	return reduced.length === 3 ? `#${reduced}` : hex;
};

export const readyRegexString = (string: string) => {
	return string.replace(/(?<!\\)(\(|\))/g, '\\$1');
};

export const convertType = (colorType: string, colorObj: ColorStringObject) => {
	return colorObj.model !== colorType && convert[colorObj.model][colorType] && colorType !== 'hex'
		? convert[colorObj.model][colorType](colorObj.value)
		: colorObj.value;
};
