# UI Behavior Port Plan

## Sidepanel/Chat/form.tsx

- Keep our component and visuals
- Integrate upstream behaviors:
  - Project folder creation/rename/delete
  - Chat history grouping by date
  - Temporary chat saving and restore
- Reconcile prop/signature changes from useMessage and services

## ChatInput Controls

- Keep visuals (icons, layout)
- Port upstream fixes: Stop flow, Speech handling, Thinking controls, submit dropdown behavior
- Remove VisionToggle mounting (feature removed), keep file for now

## Validation

- Manual smoke: create folder, send messages, temp chat toggle, date group rendering
- Unit tests pass for controls and sidepanel
