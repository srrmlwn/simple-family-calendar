import {NLPParser} from "../../src/services/nlpParser";

function testParser() {
    const parser = new NLPParser();

    const examples = [
        // "Schedule a meeting with John tomorrow at 10 am for 30 minutes in conference room A about the project proposal",
        // "Remind me to call Sarah on Friday at 2 PM",
        // "Book a doctor appointment next Monday morning",
        // "Team lunch on Wednesday at 12:30 PM at The Italian Place",
        // "Vacation from July 1st to July 15th",
        // "Presentation about the new product lasting 1 hour on April 10th at 3 PM",
        // "Dentist appointment on May 5th at 9 am",
        // "Follow up with the client regarding the contract",
        // "All day event on Saturday: Birthday Party",
        // "Set a reminder to pay bills on the 25th of this month",
        // "Meeting on the 25th at 10am",
        // "Meeting on the 5th at 2pm",
        // "Hariniis birthday on March 15th all day"
        "Important meeting on the 21st at 4pm"
    ];

    const now = new Date();
    console.log(`Current date: ${now.toDateString()}`);

    examples.forEach(example => {
        console.log(`\nInput: "${example}"`);
        const parsed = parser.parseEvent(example, 'America/Los_Angeles');
        if (parsed) {
            console.log('Title:', parsed.title);
            console.log('Start:', parsed.startTime.toLocaleString());
            console.log('End:', parsed.endTime.toLocaleString());
            console.log('Duration:', parsed.duration, 'minutes');
            console.log('All day:', parsed.isAllDay);
            if (parsed.location) console.log('Location:', parsed.location);
            if (parsed.description) console.log('Description:', parsed.description);
        } else {
            console.log('Failed to parse input');
        }
    });
}

testParser();