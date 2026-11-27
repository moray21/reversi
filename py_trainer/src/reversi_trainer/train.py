"""学習のエントリポイント"""

from pathlib import Path

import click


@click.command()
@click.argument("config_file", type=Path, help="設定ファイルのパス")
def main(config_file: Path) -> None:
    """学習の実行"""
    pass
