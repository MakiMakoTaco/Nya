function calcNumberFormat(number) {
	/*
	 * calcNumberFormat() : Calculates the difference between two dates
	 * @number : ""
	 * return : Array
	 */

	const checkLastTwoDigits = number % 100;

	// Set up custom text
	const calcFormat = [
		'th',
		'st',
		'nd',
		'rd',
		'th',
		'th',
		'th',
		'th',
		'th',
		'th',
	];

	// Check if the number ends in 11, 12, or 13
	const endsInSpecial =
		checkLastTwoDigits === 11 ||
		checkLastTwoDigits === 12 ||
		checkLastTwoDigits === 13;

	// Get the last digit to determine the suffix
	const lastDigit = number % 10;

	// Display result with custom text
	let result = '';
	if (endsInSpecial) {
		result = number + calcFormat[0];
	} else {
		result = number + calcFormat[lastDigit];
	}

	//return the result
	return {
		result: result,
	};
}

module.exports = { calcNumberFormat };
