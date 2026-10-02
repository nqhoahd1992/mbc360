import { Button, Drawer, Grid, type ButtonProps } from 'antd';
import { useExclusiveDrawer } from '../hooks/exclusiveDrawer';
import '../styles/concept.css';
import './FormDrawer.css';

// The side panel every create / edit / reference flow opens in (2026-10-02,
// project owner: "đổi toàn bộ mọi chỗ từ Modal sang Drawer"). A record now has
// one place on screen — the right-hand panel where it is also read and edited —
// instead of a centred dialog for creating it and a drawer for everything else.
//
// The props mirror antd Modal's on purpose (onOk / onCancel / okText /
// okButtonProps / confirmLoading / footer / width), so a former Modal converts
// by renaming the tag and nothing about its submit logic changes: a create flow
// still commits only when its primary button is pressed.
//
// What stays a Modal: confirmations of a single act (withdraw with a reason,
// modal.confirm prompts), the authenticator step-ups and signature capture, and
// the command palette. Those interrupt one decision and should block the page;
// a panel beside it invites carrying on with something else half-done.
export default function FormDrawer({
  open,
  title,
  onCancel,
  onOk,
  okText = 'OK',
  cancelText = 'Cancel',
  okButtonProps,
  confirmLoading,
  footer,
  width = 560,
  children,
  destroyOnHidden,
}: {
  open: boolean;
  title: React.ReactNode;
  onCancel: () => void;
  onOk?: () => void;
  okText?: React.ReactNode;
  cancelText?: React.ReactNode;
  okButtonProps?: ButtonProps;
  confirmLoading?: boolean;
  // `null` = no footer (a read-only panel); a node or an array replaces the
  // default Cancel / OK pair, as on Modal.
  footer?: React.ReactNode | React.ReactNode[] | null;
  // Modal widths were up to 1200px; a side panel caps at the viewport.
  width?: number | string;
  children?: React.ReactNode;
  destroyOnHidden?: boolean;
}) {
  const screens = Grid.useBreakpoint();
  useExclusiveDrawer(open, onCancel);

  const defaultFooter = (
    <div className="fd-foot">
      <Button onClick={onCancel}>{cancelText}</Button>
      {onOk && (
        <Button type="primary" loading={confirmLoading} {...okButtonProps} onClick={onOk}>
          {okText}
        </Button>
      )}
    </div>
  );
  const resolvedFooter =
    footer === null ? undefined : footer === undefined ? defaultFooter : <div className="fd-foot">{footer}</div>;

  return (
    <Drawer
      open={open}
      title={title}
      onClose={onCancel}
      size={screens.md ? (typeof width === 'number' ? Math.min(width, 1100) : width) : '100%'}
      mask={!screens.xxl}
      rootClassName="concept-tokens"
      footer={resolvedFooter}
      destroyOnHidden={destroyOnHidden}
    >
      {children}
    </Drawer>
  );
}
