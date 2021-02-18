// export type ColorType = 'hex' | 'rgb' | 'hsl' | 'hsv' | 'hwb' | 'cmyk' | 'ansi' | 'ansi16';
export type ColorType = 'hex' | 'rgb' | 'hsl';

export interface ColorReplaceOptions {
	fromType?: ColorType;
	toType?: ColorType;
	includeAlphas?: boolean;
}

export interface ColorStringObject {
	model: ColorType;
	value: number[];
}
