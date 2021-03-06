import valueParser from 'postcss-values-parser';

export function getMediaQueryCustomProperties(root, opts) {
	const mediaQueryRules = [];
	root.nodes.slice().forEach(rule => {
		if (isMediaQuery(rule)) {
			// Circular dependency here
			// getCustumProperties calls this function
			// if a mediaquery is present all its props will be found via getCustomProperties again
			// this will be done until all mediaquery rules are traversed
			const customProps = getCustomPropertiesFromRoot(rule, opts);

			mediaQueryRules.push({
				params: rule.params,
				rules: customProps
			});
		}
	});
	return mediaQueryRules;
}

// return custom selectors from the css root, conditionally removing them
export default function getCustomPropertiesFromRoot(root, opts) {
	// initialize custom selectors
	const customPropertiesFromHtmlElement = {};
	const customPropertiesFromRootPsuedo = {};

	// for each html or :root rule
	root.nodes.slice().forEach(rule => {
		const customPropertiesObject = isHtmlRule(rule)
			? customPropertiesFromHtmlElement
		: isRootRule(rule)
			? customPropertiesFromRootPsuedo
		: null;

		// for each custom property
		if (customPropertiesObject) {
			rule.nodes.slice().forEach(decl => {
				if (isCustomDecl(decl)) {
					const { prop } = decl;

					// write the parsed value to the custom property
					customPropertiesObject[prop] = valueParser(decl.value).parse().nodes;

					// conditionally remove the custom property declaration
					if (!opts.preserve) {
						decl.remove();
					}
				}
			});

			// conditionally remove the empty html or :root rule
			if (!opts.preserve && isEmptyParent(rule)) {
				rule.remove();
			}
		}
	});

	// return all custom properties, preferring :root properties over html properties
	return {
		...customPropertiesFromHtmlElement,
		...customPropertiesFromRootPsuedo,
		mediaQueries: getMediaQueryCustomProperties(root, opts)};
}

// match html and :root rules
const htmlSelectorRegExp = /^html$/i;
const rootSelectorRegExp = /^:root$/i;
const customPropertyRegExp = /^--[A-z][\w-]*$/;

// whether the node is an html or :root rule
const isHtmlRule = node => node.type === 'rule' && htmlSelectorRegExp.test(node.selector) && Object(node.nodes).length;
const isRootRule = node => node.type === 'rule' && rootSelectorRegExp.test(node.selector) && Object(node.nodes).length;

const isMediaQuery = node => {
	const isAtRule = node.type === "atrule";
	const isMedia = node.name === "media";
	const hasNodes = Object(node.nodes).length;

	return isAtRule && isMedia && hasNodes;
};

// whether the node is an custom property
const isCustomDecl = node => node.type === 'decl' && customPropertyRegExp.test(node.prop);

// whether the node is a parent without children
const isEmptyParent = node => Object(node.nodes).length === 0;
