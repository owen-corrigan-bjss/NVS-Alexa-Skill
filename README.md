# Newcastle Vision Support Alexa Skill

This is the code base for the Newcastle Vision Support Alexa skill.

## The Lambda

The main functionality the charity wanted to achieve was the playing of their audio newsletter through a smart speaker. 

The skill achieves this by using the [RSSParser](https://www.npmjs.com/package/rss-parser) to retrieve the RSS feed from NVS's newsletter page. The feed is then filtered to return the latest audio. 

The skill has a secondary feature that allows you to list the events that have been posted in the last 30 days. This again uses [RSSParser](https://www.npmjs.com/package/rss-parser) to return a readable feed. 

##

### Constraints

Due to restrictions in how the charities website RSS feed is set up the date of the event was excluded. This meant having to filter based on when the event was posted.

Pause and Resume intents currently not supported. The chairty has no budget and so the potential for accumulating costs by retrieving data from a DB meant this feature had to be ommited. 
