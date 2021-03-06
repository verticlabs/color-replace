// export type ColorType = 'hex' | 'rgb' | 'hsl' | 'hsv' | 'hwb' | 'cmyk' | 'ansi' | 'ansi16';
export type ColorType = 'hex' | 'rgb' | 'hsl';

export interface ColorReplaceOptions {
	stringType?: 'string' | 'css' | 'html';
	includeColorKeyword?: boolean;
	hexAlphaSupport?: boolean;
}

export interface ColorStringObject {
	model: ColorType;
	value: number[];
}

export interface RegexObject {
	color: string;
	regex?: string;
	groups: number;
	newColors?: { [key: string]: string };
	replaceAlpha?: boolean;
}
