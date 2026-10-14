import { useState } from 'react';
import { Button, Input, Modal, Tooltip, message } from 'antd';
import { StopOutlined } from '@ant-design/icons';
import type { ProjectData } from '@mbc360/shared/types';
import { stopRefusal } from '@mbc360/shared/utils/projectStop';
import { useAppStore } from '../store/useAppStore';
import { useSession } from '../auth/useSession';

// SW-31 — the Stop button and its confirmation, shared by the Project Overview card and the Gap assessment block so
// a project can be stopped from wherever the Critical gap is being looked at. The decision of whether it is allowed
// is `stopRefusal` over the SAVED project (the server checks the same thing); `unsaved` says the grade on screen is
// not saved yet, which the button names rather than silently failing.
export default function StopProjectAction({ project, unsaved = false }: { project: ProjectData; unsaved?: boolean }) {
  const session = useSession();
  const stopProject = useAppStore((s) => s.stopProject);
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const identity = project.identity;

  const canStop = !!session.user && (session.isAdmin || identity.projectLead.trim() === session.user.displayName.trim());
  if (!canStop) return null;

  const refusal = unsaved ? 'Save the Critical assessment first' : stopRefusal(project);

  const confirm = async () => {
    setBusy(true);
    try {
      await stopProject(identity.id, comment.trim());
      setOpen(false);
      setComment('');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Could not stop the project');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Tooltip title={refusal ?? undefined}>
        <span>
          <Button danger icon={<StopOutlined />} disabled={!!refusal} onClick={() => setOpen(true)}>
            Stop project
          </Button>
        </span>
      </Tooltip>
      <Modal
        open={open}
        title="Stop this project?"
        okText="Stop project"
        okButtonProps={{ danger: true, disabled: comment.trim() === '' }}
        confirmLoading={busy}
        onOk={confirm}
        onCancel={() => setOpen(false)}
      >
        <p>
          Stopping is <b>final</b>. The project becomes read-only exactly as it is now and can never be reopened. The
          Critical gap is recorded automatically as the reason; add your own comment below.
        </p>
        <Input.TextArea
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Why is this project being stopped? (required)"
        />
      </Modal>
    </>
  );
}
