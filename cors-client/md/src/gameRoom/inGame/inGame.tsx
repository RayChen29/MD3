import {  
    createContext,
    useState,
    useEffect,
} from 'react';
import {Socket} from 'socket.io-client';
import io from 'socket.io-client';
import {useNavigate} from 'react-router-dom';
//TODO?: Create "Card" components
export default function InGame() {
    //connect to game

    return(
        <GameBoard>
            {/* GameBoard probably holds the deck and that everybody practically shares from it... somehow. */}
            <Deck/>
            <Discard/>
            <Player/>
            {/* TODO: have a player for each player in the game... somehow. Only support 4 for now */}
        </GameBoard>

    )
}



/* 
    TODO List
    add an inGame prop?

    While room is empty / When a room's game finishes :
        Server: Check room's inGame status (a new prop to implement later.). -Should be checked in intervals probably.
            If true: leave alone. 
            
            If false: dump/delete Deck, Discard, and maybe players. Then assign a fresh new deck to Deck. Point is to reset the game state.
            Then set isReset to true.

        Client: After the game concludes:
            Maybe disconnect users so they stay on the screen.
            maybe after 30 seconds or clicking the accompanying button, take user back to the game room.
                I guess there can be 3 buttons: one to go back to the room, one to go back to the front screen, one to look at the end board, then put the other two buttons down somewhere on the screen.

            Potential issue: Should host reprise their position if they're still present? Or should it go to the first to join back in the room?

    During gameplay:
        TODO LIST
    //TODO? Include animation of cards moving between hands, play/discard piles, deck, etc.
    //TODO: Include monopoly deal logo or something at the 'back' of every card
    At start of game (idk how to mark), pass 5 cards to all players, but 1 at a time? How to do?
    Should cards have an owner property, like whose field it is on?

        Cards:
            Props:
                Type?
                Value
                Color?
                How to handle Wildcard props?
            Method(s):
                Property set conversion. -> If a full set is gathered, they just become a set object
                Property Rearrangement -> moving around wildcards or other properties to player's preference or to win.
                    TODO: ONLY allow rearrangement during their turn or when they must turn over property.
                        TODO? Allow this when they must pay money as well
                    TODO: Handle users breaking sets, whether to pay off the mone
        TODO? implement methods for each Action card 
            IMPORTANT: Allow user (somehow) to chain Double Rent to a Rent card; Will cost 2 actions
                IMPORTANT: Allow other user(s) to Just Say No -> Double Rent; people still have to pay original rent

        Sets:
            Color
            Breakpoint
            Value


        Server:
            Shuffle deck at start of game and whenever deck runs out
            TODO: Code top of deck to be at [0] I guess.
            Keep note of whose turn it is, who is allowed to play what cards when, etc.
            Show # of cards in deck, discard, maybe players 
            Maybe have card values in visible corners?
            Q: How to present the cards: Separated, or as if holding them until hovered?

            Make events for the following:
                Start of player's turn
                    Draw correct number of cards 
                End of player's turn
                    handcheck/mandatory discard
                Responding to Action Cards
                Timing/Ability to play Reaction Cards
                Announcing that wincon is met
                Deck Shuffling


            
            Add props for the players
                turnPlayer: Boolean. Is it their turn? 
                actions: Number. How many actions left? Q: How to differientiate when actiosn are consumed?
                moneyCards: Cards[]? Cards in player's money pile
                properties: Cards[]? Cards in player's property pile.
                netWorth? Number, if owed amount  > props + moneyCards, just clear this.
                    OR: just make a check for it down the line, and clear up any debt that comes up if cannot be paid further.
                


        Client:
            Show number of actions remaining
            Make events/rules for the following:
                Placing card from hand to money pile
                Placing card from hand to property pile
                    Regular Property
                    House/Hotel onto Property
                TODO: how to handle wild card property
                TODO: How to handle dual-color property
                Action Cards
                Reaction Cards

            

*/