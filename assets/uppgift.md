## Här är tre gasoptimeringar och säkerhetsåtgärder som andvänds i kontraktet:

1. #### Användning av calldata istället för memory för parametrar i externa funktioner:

   - Genom att använda calldata för variabler som inte modifieras (som \_genre och \_movies i createSurvey funktionen) minskas gasanvändningen eftersom calldata direkt pekar på indata utan att skapa en kopia. Detta minskar både minnesanvändningen och kostnaden.

2. #### Begränsning av for-loopens storlek:

   - I createSurvey funktionen används en loop för att lägga till filmer i omröstningen. Här undviks en oändlig eller stor loop eftersom de kan bli dyra i gas. Denna loop ser till att bara behandla ett rimligt antal filmer och begränsar input för att förhindra att kontraktet slutar fungera på grund av gasutnyttjande.

3. #### Modifierare för att spara gas och förbättra säkerhet:

   - Modifierare som kontrollerar tillståndet för en omröstning, som surveyExists och surveyOngoing, istället för att duplicera samma logik i varje funktion. Detta förbättrar både gasanvändningen och säkerheten genom att undvika upprepande kod och att centralisera logikkontroller.
