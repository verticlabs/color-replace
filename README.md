# @verticlabs/color-replace

@verticlabs/color-replace is a replacement library for JavaScript. It replaces all instances of colors in all their forms. Simply pass a color in any format, provide a replacement color (also in any format and it doesn't need to be in the same format as the search color), and it will find all instances of that color and all formats (`hex`, `rgb`, `hsl` and the color keyword if it exists) in a given string.

## Usage

This library can be used to replace all instances of one or many colors in a given string.

### Change one color to another

To change one specific color to another in a string then use it as:

```javascript
import { colorReplace } from '@verticlabs/color-replace';

const string = 'string test of rgb(255, 255, 255) replacement';

const updatedString = colorReplace('#fff', '#ddd', string);

// response: string test of rgb(221, 221, 221) replacement
```

### Changing multiple colors in one string

It can also be used to replace many colors at once:

```javascript
import { colorReplaceMap } from '@verticlabs/color-replace';

const string = 'string test of white, rgb(0, 128, 0) and hsla(0, 0%, 0%, 0.3)';

const colorMap = {
  '#fff': '#ddd',
  'rgb(0, 0, 0)': '#111',
  green: 'blue',
};

const updatedString = colorReplaceMap(colorMap, string);

// response: string test of #DDD, rgb(0, 0, 255) and hsla(0, 0%, 7%, 0.3)
```

### Changing color in a CSS string

When defining the the string is a CSS string, then it will only replace the color instances if they are within the CSS value (between a colon and semicolon character):

```javascript
import { colorReplace } from '@verticlabs/color-replace';

const string = '.btn--white { color: #fff; }';

const updatedString = colorReplace('rgb(255, 255, 255)', '#ddd', string, {
  stringType: 'css',
});

// response: .btn--white { color: #DDD; }
```

## Options

| Name | Type | Default | Description |
| :----: | :----: | :-------: | :----------- |
| **[`stringType`](#stringType)** | `{String}` | `string` | The type of the passed string
| **[`includeColorKeyword`](#includeColorKeyword)** | `{Boolean}` | `true` | Enable/disable lookups for color keywords

### `stringType`

Type: `String`  
Default: `string`  
Options: `string` | `css`

Tell the library what type of string has been passed and it will act accordingly.

It will replace all instances of the color(s) if it's set as `string`.

If the library is used on a CSS string, then it recommended to set this option as `css` - especially when also having the [`includeColorKeyword`](#includeColorKeyword) as `true` - as then it will only replace instances in the CSS value and ignore any keyword instances in URLs (e.g. background image stylings). This way it won't change the class names, styling properties etc.

### `includeColorKeyword`

Type: `Boolean`  
Default: `true`

Sets if color keywords (i.e. "white" or "blue") should also be replaced.
