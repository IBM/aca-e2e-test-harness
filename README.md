# IBM Advanced Conversational Asset's E2E Test Harness


## Development

Before getting started on actual coding please get familiar with [Contribution Guidelines](./CONTRIBUTING.md)

## Running the test harness

Before running a test suite, please make sure you checked [e2e.env.template](e2e.env.template) .
`e2e.env` It is used to load internal environment variables.

Code and configuration related to e2e tests are located in `/tests`.
To run a e2e test suite, in root test harness directory run command:

```bash
yarn test:e2e:async -s <client> -e <env>
```

Example:

```bash
yarn test:e2e:async -s aca -e demo
```

-s (space) and -e (environment) is logic taken from spaces and envs from cloud foundry. These are taken from e2e.env as first two words. Example: **aca**_**demo**_socketio_url

Tests available:

- async Liveperson bot tests - test:e2e:async
- sync Liveperson bot tests - test:e2e:sync
- Nuance bot tests - test:e2e:nuance
- Bot Chat API bot tests - test:e2e:chat-api
- SocketIO bot tests - test:e2e:socketio
- Genesys bot tests - test:e2e:genesys

To run all tests (will skip tests if environment variables do not have it enabled, for instance: `aca_demo_chat_api_enabled=true`):

- all tests - test:e2e

Mandatory command options/environment variables:

- `-s` - client ID.
- `-e` - `dev` or `test` environment to be used.

Optional command options/environment variables:

- `-p, --test-case-path <path>` - Path to test cases.
- `-o, --run-only <cases>` - Run only specified test cases. I.e. `1,2` or/and range `1-10`.
- `-n, --leave-open` - Leave conversations open. Only for LivePerson Async and Nuance.
- `-c, --ci` - CI mode with reduced logging.
- `-d, --debug` - Log detailed debug information.
- `-w, --workers [workers]` - Number of parallel workers.
- `-r, --repeat [count]` - Run the test cases again and again up to `<count>` tests in total.
- `--delay [ms]` - Random delay in ms between human messages.
- `-t, --suite [suite]` - pecific test suite to run.
- `-f, --config-file <path>` - Path to dotenv config file, `e2e.env`.
- `-l, --log-file <path>` - Path to the logfile.
- `--csv` - Create csv report. Note that it only works with -t [suite]

Test Suite

YAML file strucure

```yml
---
greetings: # greetings are used for repeated lines in scripts
  - id: 0
    human: Hi from customer
  - id: 1
    bot: Hi, welcome to ACA Demo Space! || Hi
  - id: 2
    bot: I will do my best to demonstrate some of the ACA capabilities!

test-cases:
  - name: 1 - Simple conversation # has to be "NUMBER - Test case name". Number has to be integer and unique
    typing: true # for socketio only. If 'typing: true' not present, will be true by default. If bot does not send typing status, need to set 'typing: false'.
    channel: facebook # for async only. Set any string that will be included into customerID.
                      # If not specified, will use e2e.env value. If absent in e2e.env - nothing will be added to customerID.
    script:
      - greeting: 0
      - greeting: 1
      - greeting: 2
      - rsleep: 5000 # will sleep random time from 0 to 5s before starting to process next line
      - human: What's your name?
      - bot: I have many names. Today my name is
        partial: true # when this is present, it will only check if response from bot includes "I have many names. Today my name is"
      - human: Show me a video
      - bot: Just look at this amazing video! https://www.youtube.com/watch?v=_Xcmh1LQB9I
        type: chat-api # only this bot message will be asserted when running chat-api runner, all other types will be ignored
      - bot: "Just look at this amazing video! <div class=\"video\" url=\"https://www.youtube.com/watch?v=_Xcmh1LQB9I\" style=\"display:none;\"></div>"
        partial: true # can still be used here if needed
        type: socketio
      - bot: "Just look at this amazing video! <div class=\"video\" url=\"https://www.youtube.com/watch?v=_Xcmh1LQB9I\" style=\"display:none;\"></div>"
        type: sync
      - bot: "Just look at this amazing video! <div class=\"video\" url=\"https://www.youtube.com/watch?v=_Xcmh1LQB9I\" style=\"display:none;\"></div>"
        type: async
      - bot: "Just look at this amazing video! <div class=\"video\" url=\"https://www.youtube.com/watch?v=_Xcmh1LQB9I\" style=\"display:none;\"></div>"
        type: nuance
      - human: bye
      - bot: Thank you for your time! See you next time || I hope everything was sorted. Bye bye! || Thank you. Bye! # "||" separates different possible responses
        partial: true # can still be used here if needed
      - sleep: 5000 # will sleep 5s before starting to process next line
      - chatClosed: true    # will check if chat is closed, only for LivePerson Async
        type: async         # therefore we add type async
```
