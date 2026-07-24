import { execFile } from "child_process";
import fs from "fs";
import { writeFileSync } from "fs";
import { promisify } from "util";
import os from "os";
import path from "path";
import { findNvimPath } from "./nvim";
import { BUILTIN_KEYMAPS } from "./builtins";
import { KeymapEntry } from "./types";

const execFileAsync = promisify(execFile);

const DUMP_LUA = `
-- Source user keymaps if they weren't loaded (headless mode skips some configs)
local ok, _ = pcall(dofile, vim.fn.stdpath("config") .. "/lua/config/keymaps.lua")
if not ok then
  pcall(dofile, os.getenv("HOME") .. "/.config/nvim/lua/config/keymaps.lua")
end

-- Open a buffer so ftplugin and buffer-local keymaps load
vim.cmd("e /tmp/.nvim-keymaps-dump")

-- Detect leader key
local leader = vim.g.mapleader or " "
local lmode = vim.g.maplocalleader or " "
local function resolve_lhs(lhs)
  if lhs:sub(1, #leader) == leader then
    return "<leader>" .. lhs:sub(#leader + 1)
  end
  if lmode ~= leader and lhs:sub(1, #lmode) == lmode then
    return "<localleader>" .. lhs:sub(#lmode + 1)
  end
  return lhs
end

local keymaps = vim.api.nvim_get_keymap("n")
local result = {}
for _, km in ipairs(keymaps) do
  local lhs = km.lhs or ""
  if not lhs:match("^<Plug>") then
    table.insert(result, {
      lhs = resolve_lhs(lhs),
      rhs = km.rhs or "",
      desc = km.desc or "",
      source = (km.callback and "plugin") or (km.rhs ~= "" and "plugin") or "user",
    })
  end
end
local buf_keymaps = vim.api.nvim_buf_get_keymap(0, "n")
for _, km in ipairs(buf_keymaps) do
  local lhs = km.lhs or ""
  if not lhs:match("^<Plug>") then
    table.insert(result, {
      lhs = resolve_lhs(lhs),
      rhs = km.rhs or "",
      desc = km.desc or "",
      source = "buffer",
    })
  end
end
print(vim.json.encode(result))
vim.cmd("q!")
`;

let cachedKeymaps: KeymapEntry[] | null = null;

export async function getKeymaps(forceRefresh = false): Promise<KeymapEntry[]> {
  if (cachedKeymaps && !forceRefresh) {
    return cachedKeymaps;
  }

  try {
    const nvimBin = findNvimPath();
    const suffix = Math.random().toString(36).slice(2, 8);
    const scriptPath = path.join(os.tmpdir(), `nvim-keymaps-${process.pid}-${suffix}.lua`);
    writeFileSync(scriptPath, DUMP_LUA);

    const { stdout, stderr } = await execFileAsync(nvimBin, ["--headless", "-S", scriptPath], {
      timeout: 15000,
    });

    try { fs.unlinkSync(scriptPath); } catch { /* ignore */ }

    // nvim headless sends print() to stderr, not stdout
    // Strip ANSI escape sequences before parsing
    const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
    const raw = stripAnsi(stderr || stdout);

    // Find the JSON array
    const firstBracket = raw.indexOf("[");
    const lastBracket = raw.lastIndexOf("]");
    if (firstBracket < 0 || lastBracket <= firstBracket) {
      throw new Error("No JSON array found in nvim output");
    }

    const json = raw.substring(firstBracket, lastBracket + 1);
    const parsed = JSON.parse(json);

    const userLhs = new Set<string>();
    const userKeymaps: KeymapEntry[] = parsed.map((km: Record<string, string>) => {
      const lhs = km.lhs || "";
      userLhs.add(lhs);
      return {
        lhs,
        desc: km.desc || km.rhs || "",
        rhs: km.rhs || "",
        source: km.source || "unknown",
      };
    });

    for (const b of BUILTIN_KEYMAPS) {
      if (!userLhs.has(b.lhs)) {
        userKeymaps.push({ ...b, source: "builtin" });
      }
    }

    cachedKeymaps = userKeymaps;
    return cachedKeymaps!;
  } catch {
    return [];
  }
}

export function clearCache() {
  cachedKeymaps = null;
}
