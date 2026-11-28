"""PyTorchモデルをONNX形式にエクスポートするエンドポイント"""

from pathlib import Path

import click


@click.command()
@click.argument("path", type=click.Path(exists=True, path_type=Path))
def main(path: Path) -> None:
    """
    エクスポート処理を実行する

    Parameters
    ----------
    path : Path
        モデルのパス
    """
    pass
