import { getAliFullStackRunTerminalCmdTags, cleanCommandString } from './src/ipc/utils/alifullstack_tag_parser.js';

const response = `<run_terminal_cmd>
<command>cd /tmp && echo "hello"</command>
</run_terminal_cmd>`;

console.log(getAliFullStackRunTerminalCmdTags(response));
