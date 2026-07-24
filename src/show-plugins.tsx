import { Action, ActionPanel, Grid, Icon, List, showToast, Toast } from "@raycast/api";
import { usePlugins } from "./lib/plugins";
import { layout } from "./lib/preferences";

export default function ShowPlugins() {
  const { plugins, isLoading, error } = usePlugins();

  if (error) {
    showToast(Toast.Style.Failure, "Failed to load plugins");
  }

  if (layout === "grid") {
    return (
      <Grid isLoading={isLoading} searchBarPlaceholder="Search installed plugins..." columns={5}>
        <Grid.Section title="Installed Plugins">
          {plugins.map((plugin) => (
            <Grid.Item
              key={plugin.name}
              title={plugin.name}
              subtitle={plugin.branch}
              content={Icon.Plug}
              keywords={[plugin.commit.slice(0, 7), plugin.branch]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    {plugin.githubUrl && (
                      <Action.OpenInBrowser
                        title="Open GitHub Page"
                        url={plugin.githubUrl}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard
                      title="Copy Plugin Name"
                      content={plugin.name}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Commit Hash"
                      content={plugin.commit}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      </Grid>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search installed plugins...">
      <List.Section title="Installed Plugins" subtitle={`${plugins.length}`}>
        {plugins.map((plugin) => (
          <List.Item
            key={plugin.name}
            title={plugin.name}
            subtitle={plugin.branch}
            icon={Icon.Plug}
            accessories={[
              {
                tag: plugin.commit.slice(0, 7),
                tooltip: `Commit: ${plugin.commit}`,
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {plugin.githubUrl && (
                    <Action.OpenInBrowser
                      title="Open GitHub Page"
                      url={plugin.githubUrl}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Plugin Name"
                    content={plugin.name}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Commit Hash"
                    content={plugin.commit}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
