# sh-2020-01
> found v0.1.5c

> fixed v0.1.6

Context:
- GameState::selectKill
- GameState::players::oneDead

IgnorePlayers was intialized incorrectly using a ciruclar structure (client).
This caused an Exception and thus inconsistencies

# sh-2020-02
> found v0.1.5c

> fixed v0.1.6

Context:
- GameState::Logs
- GameState::voteChancellor

If a vote fails, a log is printed. The log falsly used this.currentChancellor instead of this.canidateChancellor

# sh-2020-03
> found v0.1.6

> fixed v0.1.7

Context:
- Player::Spectator
- Client::VoteContext
- VoteContext::voteEnded

The vote Context creates an error, because on the spectator side no start() was ever called so results view
were never created

# sh-2020-04
> found v0.1.7

> fixed v0.1.7a

A Channge in v0.1.7 prevented the results to be send in case of the votingEnded Event.