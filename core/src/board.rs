//! 盤面などのパーツを定義するモジュール
//!
//! # Enum
//!
//! * `Disc` - ディスク
//! * `BoardSize` - 盤面のサイズ
//!
//! # Struct
//!
//! * `Board` - 盤面
//! * `Point` - 盤面の座標

use ndarray::{Array2, Array3, Axis};

// ------------------------------ Disc ------------------------------
/// ディスクの種類
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Disc {
    Black = 1,
    White = -1,
}

impl Disc {
    /// 相手の色を返す
    ///
    /// # Returns
    ///
    /// * `Disc`
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::Disc;
    /// assert_eq!(Disc::Black.opposite(), Disc::White);
    /// assert_eq!(Disc::White.opposite(), Disc::Black);
    /// ```
    pub fn opposite(&self) -> Self {
        match self {
            Disc::Black => Disc::White,
            Disc::White => Disc::Black,
        }
    }
}

// ------------------------------ Board ------------------------------

/// 盤面のサイズ
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BoardSize {
    Size4 = 4,
    Size6 = 6,
    Size8 = 8,
}

/// 盤面の座標 (左上が(0,0))
///
/// # Attributes
///
/// * `row` - 行
/// * `col` - 列
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Point {
    pub row: usize,
    pub col: usize,
}

impl Point {
    /// 座標を作成する
    ///
    /// # Arguments
    ///
    /// * `row` - 行
    /// * `col` - 列
    ///
    /// # Returns
    ///
    /// * `Point`
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::Point;
    /// let point = Point::new(0, 0);
    /// assert_eq!(point.row, 0);
    /// assert_eq!(point.col, 0);
    /// ```
    pub fn new(row: usize, col: usize) -> Self {
        Self { row, col }
    }

    /// 座標に対応する位置が1である64ビットに変換する
    ///
    /// # Returns
    ///
    /// * `u64` - 座標に対応する位置が1で、それ以外が0の64ビット
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Point, BoardSize};
    ///
    /// // 4×4
    /// let point = Point::new(0, 1);
    /// assert_eq!(point.to_bit(BoardSize::Size4), 0x0000_0000_0000_4000);
    ///
    /// // 6×6
    /// let point = Point::new(0, 1);
    /// assert_eq!(point.to_bit(BoardSize::Size6), 0x0000_0004_0000_0000);
    ///
    /// // 8×8
    /// let point = Point::new(0, 1);
    /// assert_eq!(point.to_bit(BoardSize::Size8), 0x4000_0000_0000_0000);
    /// ```
    pub fn to_bit(&self, size: BoardSize) -> u64 {
        let size = size as u64;
        let shift = size * size - 1 - (self.row as u64 * size + self.col as u64);
        1u64 << shift
    }

    /// 座標に対応する位置が1である64ビットから座標に変換する
    ///
    /// # Arguments
    ///
    /// * `bit` - 座標に対応する位置が1で、それ以外が0の64ビット
    /// * `size` - 盤面のサイズ
    ///
    /// # Returns
    ///
    /// * `Point`
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Point, BoardSize};
    ///
    /// // 4×4
    /// let point = Point::from_bit(0x0000_0000_0000_1000, BoardSize::Size4);
    /// assert_eq!(point.row, 0);
    /// assert_eq!(point.col, 3);
    ///
    /// // 6×6
    /// let point = Point::from_bit(0x0000_0001_0000_0000, BoardSize::Size6);
    /// assert_eq!(point.row, 0);
    /// assert_eq!(point.col, 3);
    ///
    /// // 8×8
    /// let point = Point::from_bit(0x4000_0000_0000_0000, BoardSize::Size8);
    /// assert_eq!(point.row, 0);
    /// assert_eq!(point.col, 1);
    /// ```
    ///
    /// # Panics
    ///
    /// * 1の数が1つではなかった場合
    ///
    /// ```should_panic
    /// use reversi::{Point, BoardSize};
    /// Point::from_bit(0x1001_0000_0000_0000, BoardSize::Size8);
    /// ```
    ///
    /// * インデックスが盤面外の場合
    /// ```should_panic
    /// // 6×6として渡されたものが、8×8でしか使われない場所だった場合はパニック
    /// use reversi::{Point, BoardSize};
    /// Point::from_bit(0x4000_0000_0000_0000, BoardSize::Size6);
    /// ```
    pub fn from_bit(bit: u64, size: BoardSize) -> Self {
        if bit.count_ones() != 1 {
            panic!("Invalid bit: {}", bit)
        }

        let size = size as i64;
        let square = size * size;
        let n = bit.leading_zeros() as i64 - (64 - square);
        if n < 0 {
            panic!("Invalid bit: {}", bit);
        }
        Self {
            row: (n / size) as usize,
            col: (n % size) as usize,
        }
    }

    /// 座標に対応する位置が1である64ビットから座標のリストに変換する
    ///
    /// # Arguments
    ///
    /// * `bit` - 座標に対応する位置が1で、それ以外が0の64ビット
    /// * `size` - 盤面のサイズ
    ///
    /// # Returns
    ///
    /// * `Vec<Point>` - 座標のリスト
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Point, BoardSize};
    /// let mut points = Point::from_some_bit(0x1000_1000_0000_0000, BoardSize::Size8);
    /// points.sort();
    /// let mut expect_points = vec![
    ///     Point::new(0, 3),
    ///     Point::new(2, 3),
    /// ];
    /// expect_points.sort();
    /// assert_eq!(points, expect_points);
    /// ```
    pub fn from_some_bit(mut bits: u64, size: BoardSize) -> Vec<Self> {
        let mut points = Vec::new();
        while bits != 0 {
            let index = 1u64 << (bits.trailing_zeros() as u64);
            points.push(Point::from_bit(index, size));
            bits &= bits - 1;
        }
        points
    }

    /// 座標が盤面内にあるか判定する
    ///
    /// # Arguments
    ///
    /// * `size` - 盤面のサイズ
    ///
    /// # Returns
    ///
    /// * `bool` - `true`は盤面内、`false`は盤面外
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Point, BoardSize};
    ///
    /// // (5, 5)は4×4には存在しない
    /// let point = Point::new(5, 5);
    /// assert!(!point.is_valid(BoardSize::Size4));
    /// assert!(point.is_valid(BoardSize::Size6));
    /// assert!(point.is_valid(BoardSize::Size8));
    /// ```
    pub fn is_valid(&self, size: BoardSize) -> bool {
        let size = size as usize;
        self.row < size && self.col < size
    }
}

/// 盤面(ビットボード)
///
/// # Attributes
///
/// * `size` - 盤面のサイズ
/// * `black` - 黒石が置かれている場所を1で、それ以外が0の64ビット
/// * `white` - 白石が置かれている場所を1で、それ以外が0の64ビット
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Board {
    pub size: BoardSize,
    pub black: u64,
    pub white: u64,
}

impl Board {
    /// 空の位置が1で、それ以外が0の64ビットを返す
    ///
    /// # Returns
    ///
    /// * `u64` - 空の位置が1で、それ以外が0の64ビット
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Board, BoardSize};
    /// let board = Board::new(BoardSize::Size8, 0, 0);
    /// assert_eq!(board.empty(), u64::MAX);
    /// ```
    pub fn empty(&self) -> u64 {
        !(self.black | self.white) & self.get_valid_bit()
    }

    /// 盤面を作成する
    ///
    /// # Arguments
    ///
    /// * `size` - 盤面のサイズ
    /// * `black` - 黒石が置かれている場所を1で、それ以外が0の64ビット
    /// * `white` - 白石が置かれている場所を1で、それ以外が0の64ビット
    ///
    /// # Returns
    ///
    /// * `Board`
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Board, BoardSize};
    /// let board = Board::new(BoardSize::Size8, 0, 0);
    /// assert_eq!(board.size, BoardSize::Size8);
    /// assert_eq!(board.n_black(), 0);
    /// assert_eq!(board.n_white(), 0);
    /// ```
    ///
    /// # Notes
    ///
    /// 座標は左上を(0, 0)として左から右に進み、端に達したら左下に進む
    pub fn new(size: BoardSize, black: u64, white: u64) -> Self {
        Self { size, black, white }
    }

    /// 初期状態の盤面を作成する
    ///
    /// # Arguments
    ///
    /// * `size` - 盤面のサイズ
    ///
    /// # Returns
    ///
    /// * `Board` - 中央に2個ずつ石が置かれた初期状態の盤面
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Board, BoardSize, Disc, Point};
    ///
    /// // 4×4
    /// let mut board = Board::initialize(BoardSize::Size4);
    /// assert_eq!(board.size, BoardSize::Size4);
    /// assert_eq!(board.n_black(), 2);
    /// assert_eq!(board.n_white(), 2);
    /// assert_eq!(board.n_empty(), 12);
    /// assert_eq!(board.get_disc(Point::new(1, 1)), Some(Disc::White));
    /// assert_eq!(board.get_disc(Point::new(1, 2)), Some(Disc::Black));
    /// assert_eq!(board.get_disc(Point::new(2, 1)), Some(Disc::Black));
    /// assert_eq!(board.get_disc(Point::new(2, 2)), Some(Disc::White));
    ///
    /// // 6×6
    /// board = Board::initialize(BoardSize::Size6);
    /// assert_eq!(board.size, BoardSize::Size6);
    /// assert_eq!(board.n_black(), 2);
    /// assert_eq!(board.n_white(), 2);
    /// assert_eq!(board.n_empty(), 32);
    /// assert_eq!(board.get_disc(Point::new(2, 2)), Some(Disc::White));
    /// assert_eq!(board.get_disc(Point::new(2, 3)), Some(Disc::Black));
    /// assert_eq!(board.get_disc(Point::new(3, 2)), Some(Disc::Black));
    /// assert_eq!(board.get_disc(Point::new(3, 3)), Some(Disc::White));
    ///
    /// // 8×8
    /// board = Board::initialize(BoardSize::Size8);
    /// assert_eq!(board.n_black(), 2);
    /// assert_eq!(board.n_white(), 2);
    /// assert_eq!(board.n_empty(), 60);
    /// assert_eq!(board.get_disc(Point::new(3, 3)), Some(Disc::White));
    /// assert_eq!(board.get_disc(Point::new(3, 4)), Some(Disc::Black));
    /// assert_eq!(board.get_disc(Point::new(4, 3)), Some(Disc::Black));
    /// assert_eq!(board.get_disc(Point::new(4, 4)), Some(Disc::White));
    /// ```
    pub fn initialize(size: BoardSize) -> Self {
        let mut board = Self::new(size, 0, 0);
        board.reset();
        board
    }

    /// 黒石の数を返す
    ///
    /// # Returns
    /// * `u8` - 黒石の数
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Board, BoardSize};
    /// let board = Board::new(BoardSize::Size8, 0, 0);
    /// assert_eq!(board.n_black(), 0);
    /// ```
    pub fn n_black(&self) -> u8 {
        self.black.count_ones() as u8
    }

    /// 白石の数を返す
    ///
    /// # Returns
    /// * `u8` - 白石の数
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Board, BoardSize};
    /// let board = Board::new(BoardSize::Size8, 0, 0);
    /// assert_eq!(board.n_white(), 0);
    /// ```
    pub fn n_white(&self) -> u8 {
        self.white.count_ones() as u8
    }

    /// 空の数を返す
    ///
    /// # Returns
    /// * `u8` - 空の数
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Board, BoardSize};
    /// let board = Board::initialize(BoardSize::Size8);
    /// assert_eq!(board.n_empty(), 60);
    /// ```
    pub fn n_empty(&self) -> u8 {
        self.empty().count_ones() as u8
    }

    /// 黒石の座標のリストを返す
    ///
    /// # Returns
    /// * `Vec<Point>` - 黒石の座標のリスト
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Board, BoardSize, Point};
    /// let board = Board::initialize(BoardSize::Size4);
    /// let mut points = board.get_black_points();
    /// points.sort();
    /// let mut expect_points = vec![
    ///     Point::new(1, 2),
    ///     Point::new(2, 1),
    /// ];
    /// expect_points.sort();
    /// assert_eq!(points, expect_points);
    /// ```
    pub fn get_black_points(&self) -> Vec<Point> {
        Point::from_some_bit(self.black, self.size)
    }

    /// 白石の座標のリストを返す
    ///
    /// # Returns
    /// * `Vec<Point>` - 白石の座標のリスト
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Board, BoardSize, Point};
    /// let board = Board::initialize(BoardSize::Size4);
    /// let mut points = board.get_white_points();
    /// points.sort();
    /// let mut expect_points = vec![
    ///     Point::new(1, 1),
    ///     Point::new(2, 2),
    /// ];
    /// expect_points.sort();
    /// assert_eq!(points, expect_points);
    /// ```
    pub fn get_white_points(&self) -> Vec<Point> {
        Point::from_some_bit(self.white, self.size)
    }

    /// 空の座標のリストを返す
    ///
    /// # Returns
    /// * `Vec<Point>` - 空の座標のリスト
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Board, BoardSize, Point};
    /// let board = Board::initialize(BoardSize::Size4);
    /// let mut points = board.get_empty_points();
    /// points.sort();
    /// let mut expect_points = vec![
    ///     Point::new(0, 0),
    ///     Point::new(0, 1),
    ///     Point::new(0, 2),
    ///     Point::new(0, 3),
    ///     Point::new(1, 0),
    ///     Point::new(1, 3),
    ///     Point::new(2, 0),
    ///     Point::new(2, 3),
    ///     Point::new(3, 0),
    ///     Point::new(3, 1),
    ///     Point::new(3, 2),
    ///     Point::new(3, 3),
    /// ];
    /// expect_points.sort();
    /// assert_eq!(points, expect_points);
    /// ```
    pub fn get_empty_points(&self) -> Vec<Point> {
        Point::from_some_bit(self.empty(), self.size)
    }

    /// 盤面が埋まっているかを判定する
    ///
    /// # Returns
    ///
    /// * `bool` - `true`は埋まっている、`false`は埋まっていない
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Board, BoardSize};
    /// let board = Board::initialize(BoardSize::Size8);
    /// assert!(!board.is_full());
    /// let board = Board::new(BoardSize::Size8, u64::MAX, 0);
    /// assert!(board.is_full());
    /// ```
    pub fn is_full(&self) -> bool {
        self.black.count_ones() + self.white.count_ones() == self.get_valid_bit().count_ones()
    }

    /// 盤面を初期状態に戻す
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Board, BoardSize, Disc, Point};
    ///
    /// // 4×4
    /// let mut board = Board::new(BoardSize::Size4, 0, 0);
    /// board.reset();
    /// assert_eq!(board.size, BoardSize::Size4);
    /// assert_eq!(board.n_black(), 2);
    /// assert_eq!(board.n_white(), 2);
    /// assert_eq!(board.n_empty(), 12);
    /// assert_eq!(board.get_disc(Point::new(1, 1)), Some(Disc::White));
    /// assert_eq!(board.get_disc(Point::new(1, 2)), Some(Disc::Black));
    /// assert_eq!(board.get_disc(Point::new(2, 1)), Some(Disc::Black));
    /// assert_eq!(board.get_disc(Point::new(2, 2)), Some(Disc::White));
    ///
    /// // 6×6
    /// board = Board::new(BoardSize::Size6, 0, 0);
    /// board.reset();
    /// assert_eq!(board.size, BoardSize::Size6);
    /// assert_eq!(board.n_black(), 2);
    /// assert_eq!(board.n_white(), 2);
    /// assert_eq!(board.n_empty(), 32);
    /// assert_eq!(board.get_disc(Point::new(2, 2)), Some(Disc::White));
    /// assert_eq!(board.get_disc(Point::new(2, 3)), Some(Disc::Black));
    /// assert_eq!(board.get_disc(Point::new(3, 2)), Some(Disc::Black));
    /// assert_eq!(board.get_disc(Point::new(3, 3)), Some(Disc::White));
    ///
    /// // 8×8
    /// board = Board::new(BoardSize::Size8, 0, 0);
    /// board.reset();
    /// assert_eq!(board.n_black(), 2);
    /// assert_eq!(board.n_white(), 2);
    /// assert_eq!(board.n_empty(), 60);
    /// assert_eq!(board.get_disc(Point::new(3, 3)), Some(Disc::White));
    /// assert_eq!(board.get_disc(Point::new(3, 4)), Some(Disc::Black));
    /// assert_eq!(board.get_disc(Point::new(4, 3)), Some(Disc::Black));
    /// assert_eq!(board.get_disc(Point::new(4, 4)), Some(Disc::White));
    /// ```
    pub fn reset(&mut self) {
        let size = self.size as u8;
        let half_size = size / 2;
        let w1 = half_size * size + half_size;
        let w2 = half_size * size - half_size - 1;
        let b1 = half_size * size + half_size - 1;
        let b2 = half_size * size - half_size;
        self.black = 1u64 << b1 | 1u64 << b2;
        self.white = 1u64 << w1 | 1u64 << w2;
    }

    /// 盤面を黒は1白は-1空は0の2次元配列を返す
    ///
    /// # Returns
    ///
    /// * `Vec<Vec<i8>>` - 盤面（1は黒、-1は白、0は空）
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Board, BoardSize};
    ///
    /// // 4×4
    /// let mut board = Board::initialize(BoardSize::Size4);
    /// let mut board_data = board.to_vec();
    /// assert_eq!(board_data.len(), 4);
    /// assert_eq!(board_data[0].len(), 4);
    /// assert_eq!(board_data[1][1], -1);
    /// assert_eq!(board_data[1][2], 1);
    /// assert_eq!(board_data[2][1], 1);
    /// assert_eq!(board_data[2][2], -1);
    ///
    /// // 6×6
    /// board = Board::initialize(BoardSize::Size6);
    /// board_data = board.to_vec();
    /// assert_eq!(board_data.len(), 6);
    /// assert_eq!(board_data[0].len(), 6);
    /// assert_eq!(board_data[2][2], -1);
    /// assert_eq!(board_data[2][3], 1);
    /// assert_eq!(board_data[3][2], 1);
    /// assert_eq!(board_data[3][3], -1);
    ///
    /// // 8×8
    /// board = Board::initialize(BoardSize::Size8);
    /// board_data = board.to_vec();
    /// assert_eq!(board_data.len(), 8);
    /// assert_eq!(board_data[0].len(), 8);
    /// assert_eq!(board_data[3][3], -1);
    /// assert_eq!(board_data[3][4], 1);
    /// assert_eq!(board_data[4][3], 1);
    /// assert_eq!(board_data[4][4], -1);
    /// ```
    pub fn to_vec(&self) -> Vec<Vec<i8>> {
        self.to_numpy()
            .axis_iter(Axis(0))
            .map(|row| row.to_vec())
            .collect()
    }

    /// 盤面を黒は1白は-1空は0のndarrayを返す
    ///
    /// # Returns
    ///
    /// * `Array2<i8>` - 盤面（1は黒、-1は白、0は空）
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Board, BoardSize};
    ///
    /// // 4×4
    /// let mut board = Board::initialize(BoardSize::Size4);
    /// let mut board_data = board.to_numpy();
    /// assert_eq!(board_data.shape(), [4, 4]);
    /// assert_eq!(board_data[[1, 1]], -1);
    /// assert_eq!(board_data[[1, 2]], 1);
    /// assert_eq!(board_data[[2, 1]], 1);
    /// assert_eq!(board_data[[2, 2]], -1);
    ///
    /// // 6×6
    /// board = Board::initialize(BoardSize::Size6);
    /// board_data = board.to_numpy();
    /// assert_eq!(board_data.shape(), [6, 6]);
    /// assert_eq!(board_data[[2, 2]], -1);
    /// assert_eq!(board_data[[2, 3]], 1);
    /// assert_eq!(board_data[[3, 2]], 1);
    /// assert_eq!(board_data[[3, 3]], -1);
    ///
    /// // 8×8
    /// board = Board::initialize(BoardSize::Size8);
    /// board_data = board.to_numpy();
    /// assert_eq!(board_data.shape(), [8, 8]);
    /// assert_eq!(board_data[[3, 3]], -1);
    /// assert_eq!(board_data[[3, 4]], 1);
    /// assert_eq!(board_data[[4, 3]], 1);
    /// assert_eq!(board_data[[4, 4]], -1);
    /// ```
    pub fn to_numpy(&self) -> Array2<i8> {
        let size = self.size as usize;
        let mut board = Array2::zeros((size, size));
        for p in Point::from_some_bit(self.black, self.size) {
            board[[p.row, p.col]] = Disc::Black as i8
        }
        for p in Point::from_some_bit(self.white, self.size) {
            board[[p.row, p.col]] = Disc::White as i8
        }
        board
    }

    /// 盤面を黒、白、空の順の3次元配列で表現したものを取得する
    ///
    /// # Arguments
    ///
    /// * `disc` - チャンネル1の石, チャンネル2は反対の色, 空がチャンネル3
    ///
    /// # Returns
    ///
    /// * `Array3<u8>` - 盤面
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Board, BoardSize, Disc};
    ///
    /// // 4×4 (黒指定)
    /// let mut board = Board::initialize(BoardSize::Size4);
    /// let mut board_data = board.to_tensor(Disc::Black);
    /// assert_eq!(board_data.shape(), [3, 4, 4]);
    /// assert_eq!(board_data[[1, 1, 1]], 1);
    /// assert_eq!(board_data[[0, 1, 2]], 1);
    /// assert_eq!(board_data[[0, 2, 1]], 1);
    /// assert_eq!(board_data[[1, 2, 2]], 1);
    ///
    /// // 4×4 (白指定)
    /// board_data = board.to_tensor(Disc::White);
    /// assert_eq!(board_data.shape(), [3, 4, 4]);
    /// assert_eq!(board_data[[0, 1, 1]], 1);
    /// assert_eq!(board_data[[1, 1, 2]], 1);
    /// assert_eq!(board_data[[1, 2, 1]], 1);
    /// assert_eq!(board_data[[0, 2, 2]], 1);
    ///
    /// // 6×6
    /// board = Board::initialize(BoardSize::Size6);
    /// board_data = board.to_tensor(Disc::Black);
    /// assert_eq!(board_data.shape(), [3, 6, 6]);
    /// assert_eq!(board_data[[1, 2, 2]], 1);
    /// assert_eq!(board_data[[0, 2, 3]], 1);
    /// assert_eq!(board_data[[0, 3, 2]], 1);
    /// assert_eq!(board_data[[1, 3, 3]], 1);
    ///
    /// // 8×8
    /// board = Board::initialize(BoardSize::Size8);
    /// board_data = board.to_tensor(Disc::Black);
    /// assert_eq!(board_data.shape(), [3, 8, 8]);
    /// assert_eq!(board_data[[1, 3, 3]], 1);
    /// assert_eq!(board_data[[0, 3, 4]], 1);
    /// assert_eq!(board_data[[0, 4, 3]], 1);
    /// assert_eq!(board_data[[1, 4, 4]], 1);
    /// ```
    #[allow(clippy::needless_range_loop)]
    pub fn to_tensor(&self, disc: Disc) -> Array3<u8> {
        let size = self.size as usize;
        let mut board = Array3::zeros((3, size, size));
        for r in 0..size {
            for c in 0..size {
                let point = Point::new(r, c);
                let ch = self
                    .get_disc(point)
                    .map(|d| (d != disc) as usize) // 指定の色をch0, 違う色はch1
                    .unwrap_or(2);
                board[[ch, r, c]] = 1;
            }
        }
        board
    }

    /// 指定した座標の石を取得する
    ///
    /// # Arguments
    ///
    /// * `point` - 座標
    ///
    /// # Returns
    ///
    /// * `Option<Disc>` - `Some(Disc)`はディスクあり、`None`はディスクなし
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Board, BoardSize, Disc, Point};
    /// let board = Board::initialize(BoardSize::Size8);
    /// assert_eq!(board.get_disc(Point::new(3, 3)), Some(Disc::White));
    /// assert_eq!(board.get_disc(Point::new(4, 3)), Some(Disc::Black));
    /// assert_eq!(board.get_disc(Point::new(3, 4)), Some(Disc::Black));
    /// assert_eq!(board.get_disc(Point::new(4, 4)), Some(Disc::White));
    /// assert_eq!(board.get_disc(Point::new(0, 0)), None);
    /// ```
    ///
    /// # Panics
    ///
    /// * 座標が盤面外の場合
    ///
    /// ```should_panic
    /// // 8×8でも(7, 7)までしか存在しない
    /// use reversi::{Board, BoardSize, Disc, Point};
    /// let board = Board::initialize(BoardSize::Size8);
    /// board.get_disc(Point::new(8, 8));
    /// ```
    pub fn get_disc(&self, point: Point) -> Option<Disc> {
        if !point.is_valid(self.size) {
            panic!("Invalid point: ({}, {})", point.row, point.col);
        }

        let bit = point.to_bit(self.size);
        if self.black & bit != 0 {
            Some(Disc::Black)
        } else if self.white & bit != 0 {
            Some(Disc::White)
        } else {
            None
        }
    }

    /// 盤面の有効範囲を取得する
    ///
    /// # Returns
    ///
    /// * `u64` - 盤面全体の有効な箇所を1、無効な箇所を0とした64ビット
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Board, BoardSize};
    ///
    /// // 4×4
    /// let mut board = Board::new(BoardSize::Size4, 0, 0);
    /// assert_eq!(board.get_valid_bit(), 0x0000_0000_0000_FFFF);
    /// // 6×6
    /// board = Board::new(BoardSize::Size6, 0, 0);
    /// assert_eq!(board.get_valid_bit(), 0x0000_000F_FFFF_FFFF);
    /// // 8×8
    /// board = Board::new(BoardSize::Size8, 0, 0);
    /// assert_eq!(board.get_valid_bit(), 0xFFFF_FFFF_FFFF_FFFF);
    /// ```
    pub fn get_valid_bit(&self) -> u64 {
        let size = self.size as usize;
        let n_max = size * size;
        if n_max == 64 {
            u64::MAX
        } else {
            (1u64 << n_max) - 1
        }
    }

    /// 左端のエッジを返す
    ///
    /// # Returns
    ///
    /// * `u64` - 左端の座標は1、その他は0とした64ビット
    ///
    /// # Examples
    /// ```rust
    /// use reversi::{Board, BoardSize};
    ///
    /// // 4×4
    /// let mut board = Board::new(BoardSize::Size4, 0, 0);
    /// assert_eq!(board.get_left_edge_bit(), 0x0000_0000_0000_8888);
    /// // 6×6
    /// board = Board::new(BoardSize::Size6, 0, 0);
    /// assert_eq!(board.get_left_edge_bit(), 0x0000_0008_2082_0820);
    /// // 8×8
    /// board = Board::new(BoardSize::Size8, 0, 0);
    /// assert_eq!(board.get_left_edge_bit(), 0x8080_8080_8080_8080);
    /// ```
    pub fn get_left_edge_bit(&self) -> u64 {
        let size = self.size as usize;
        let mut edge = 0u64;
        for r in 0..size {
            let p = Point::new(r, 0);
            edge |= p.to_bit(self.size);
        }
        edge
    }

    /// 右端のエッジを返す
    ///
    /// # Returns
    ///
    /// * `u64` - 右端の座標は1、その他は0とした64ビット
    ///
    /// # Examples
    /// ```rust
    /// use reversi::{Board, BoardSize};
    ///
    /// // 4×4
    /// let mut board = Board::new(BoardSize::Size4, 0, 0);
    /// assert_eq!(board.get_right_edge_bit(), 0x0000_0000_0000_1111);
    /// // 6×6
    /// board = Board::new(BoardSize::Size6, 0, 0);
    /// assert_eq!(board.get_right_edge_bit(), 0x0000_0000_4104_1041);
    /// // 8×8
    /// let board = Board::new(BoardSize::Size8, 0, 0);
    /// assert_eq!(board.get_right_edge_bit(), 0x0101_0101_0101_0101);
    /// ```
    pub fn get_right_edge_bit(&self) -> u64 {
        let size = self.size as usize;
        let mut edge = 0u64;
        for r in 0..size {
            let p = Point::new(r, size - 1);
            edge |= p.to_bit(self.size);
        }
        edge
    }

    /// 上端のエッジを返す
    ///
    /// # Returns
    ///
    /// * `u64` - 上端の座標は1、その他は0とした64ビット
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Board, BoardSize};
    ///
    /// // 4×4
    /// let mut board = Board::new(BoardSize::Size4, 0, 0);
    /// assert_eq!(board.get_top_edge_bit(), 0x0000_0000_0000_F000);
    /// // 6×6
    /// board = Board::new(BoardSize::Size6, 0, 0);
    /// assert_eq!(board.get_top_edge_bit(), 0x0000_000F_C000_0000);
    /// // 8×8
    /// board = Board::new(BoardSize::Size8, 0, 0);
    /// assert_eq!(board.get_top_edge_bit(), 0xFF00_0000_0000_0000);
    /// ```
    pub fn get_top_edge_bit(&self) -> u64 {
        let size = self.size as usize;
        let mut edge = 0u64;
        for c in 0..size {
            let p = Point::new(0, c);
            edge |= p.to_bit(self.size);
        }
        edge
    }

    /// 下端のエッジを返す
    ///
    /// # Returns
    ///
    /// * `u64` - 下端の座標は1、その他は0とした64ビット
    ///
    /// # Examples
    /// ```rust
    /// use reversi::{Board, BoardSize};
    ///
    /// // 4×4
    /// let mut board = Board::new(BoardSize::Size4, 0, 0);
    /// assert_eq!(board.get_bottom_edge_bit(), 0x0000_0000_0000_000F);
    /// // 6×6
    /// board = Board::new(BoardSize::Size6, 0, 0);
    /// assert_eq!(board.get_bottom_edge_bit(), 0x0000_0000_0000_003F);
    /// // 8×8
    /// board = Board::new(BoardSize::Size8, 0, 0);
    /// assert_eq!(board.get_bottom_edge_bit(), 0x0000_0000_0000_00FF);
    /// ```
    pub fn get_bottom_edge_bit(&self) -> u64 {
        let size = self.size as usize;
        let mut edge = 0u64;
        for c in 0..size {
            let p = Point::new(size - 1, c);
            edge |= p.to_bit(self.size);
        }
        edge
    }

    /// 8方向分のシフト量とエッジを表す64ビットの配列を返す
    ///
    /// # Returns
    ///
    /// * `[(i8, u64); 8]` - (シフト量, エッジを表す64ビット)
    ///
    /// # Notes
    ///
    /// * 右、左、下、上、右下、右上、左下、左上の順
    fn get_shift_directions(&self) -> [(i8, u64); 8] {
        let size = self.size as i8;
        let left_edge = self.get_left_edge_bit();
        let right_edge = self.get_right_edge_bit();
        let top_edge = self.get_top_edge_bit();
        let bottom_edge = self.get_bottom_edge_bit();

        [
            (-1, left_edge),                      // 右
            (1, right_edge),                      // 左
            (-size, top_edge),                    // 下
            (size, bottom_edge),                  // 上
            (-(size + 1), left_edge | top_edge),  // 右下
            (size - 1, left_edge | bottom_edge),  // 右上
            (-(size - 1), right_edge | top_edge), // 左下
            (size + 1, right_edge | bottom_edge), // 左上
        ]
    }

    /// 指定した方向で石が反転する位置を計算する
    ///
    /// # Arguments
    ///
    /// * `player` - 自分の石の色
    /// * `opposite` - 相手の石の色
    /// * `shift` - シフト量
    /// * `edge_mask` - エッジは1、その他は0とした64ビット
    ///
    /// # Returns
    ///
    /// * `u64` - 石が反転する位置を表す64ビット
    fn calc_direction_flips(&self, player: u64, opposite: u64, shift: i8, edge_mask: u64) -> u64 {
        let calc_mask = |base: u64| {
            if shift > 0 {
                (base << shift) & opposite & !edge_mask
            } else {
                (base >> (-shift)) & opposite & !edge_mask
            }
        };

        let mut flips = 0;
        let mut mask = calc_mask(player);
        while mask != 0 {
            flips |= mask;
            mask = calc_mask(mask);
        }
        flips
    }

    /// 合法手を1その他を0とした64ビットを取得する
    ///
    /// # Arguments
    ///
    /// * `disc` - 自分の石の色
    ///
    /// # Returns
    ///
    /// * `64` - 合法手を1その他を0とした64ビット
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Board, BoardSize, Disc, Point};
    ///
    /// // 8×8の初期盤面
    /// // 黒視点
    /// let board = Board::initialize(BoardSize::Size8);
    /// let mut legal_hands = board.get_legal_hands(Disc::Black);
    /// let expected_points = [Point::new(2, 3), Point::new(3, 2), Point::new(4, 5), Point::new(5, 4)];
    /// let expected_hands = expected_points.iter().fold(0, |acc, &point| acc | point.to_bit(BoardSize::Size8));
    /// assert_eq!(legal_hands, expected_hands);
    ///
    /// // 白視点
    /// legal_hands = board.get_legal_hands(Disc::White);
    /// let expected_points = [Point::new(2, 4), Point::new(3, 5), Point::new(4, 2), Point::new(5, 3)];
    /// let expected_hands = expected_points.iter().fold(0, |acc, &point| acc | point.to_bit(BoardSize::Size8));
    /// assert_eq!(legal_hands, expected_hands);
    /// ```
    pub fn get_legal_hands(&self, disc: Disc) -> u64 {
        // 盤面の取得
        let (player, opposite) = match disc {
            Disc::Black => (self.black, self.white),
            Disc::White => (self.white, self.black),
        };
        let is_valid = self.get_valid_bit();
        let empty = self.empty();

        // 打てる手がない
        if empty == 0 {
            return 0;
        }

        // 合法手を探索
        let mut legal_hands = 0;
        let directions = self.get_shift_directions();
        for &(shift, edge_mask) in &directions {
            // playerの石を置いて相手の石を挟める方向を探索
            let flips = self.calc_direction_flips(player, opposite, shift, edge_mask);
            if flips == 0 {
                continue;
            }

            // 最終的に空きマスに到達できれば合法手
            let moves = if shift > 0 {
                flips << shift
            } else {
                flips >> (-shift)
            };
            legal_hands |= moves & empty & !edge_mask;
        }

        legal_hands & is_valid
    }

    /// 合法手をPointのリストで返す
    ///
    /// # Arguments
    ///
    /// * `disc` - 自分の石の色
    ///
    /// # Returns
    ///
    /// * Vec<Point> - 合法手のリスト
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Board, BoardSize, Disc, Point};
    ///
    /// // 4×4の初期盤面
    /// // 黒視点
    /// let mut board = Board::initialize(BoardSize::Size4);
    /// let mut legal_points = board.get_legal_points(Disc::Black);
    /// legal_points.sort();
    /// let mut expect_points = vec![
    ///     Point::new(0, 1),
    ///     Point::new(1, 0),
    ///     Point::new(2, 3),
    ///     Point::new(3, 2),
    /// ];
    /// expect_points.sort();
    /// assert_eq!(legal_points, expect_points);
    ///
    /// // 白視点
    /// legal_points = board.get_legal_points(Disc::White);
    /// legal_points.sort();
    /// expect_points = vec![
    ///     Point::new(0, 2),
    ///     Point::new(1, 3),
    ///     Point::new(2, 0),
    ///     Point::new(3, 1),
    /// ];
    /// expect_points.sort();
    /// assert_eq!(legal_points, expect_points);
    ///
    /// // 6×6の初期盤面
    /// // 黒視点
    /// board = Board::initialize(BoardSize::Size6);
    /// legal_points = board.get_legal_points(Disc::Black);
    /// legal_points.sort();
    /// let mut expect_points = vec![
    ///     Point::new(1, 2),
    ///     Point::new(2, 1),
    ///     Point::new(3, 4),
    ///     Point::new(4, 3),
    /// ];
    /// expect_points.sort();
    /// assert_eq!(legal_points, expect_points);
    ///
    /// // 白視点
    /// legal_points = board.get_legal_points(Disc::White);
    /// legal_points.sort();
    /// expect_points = vec![
    ///     Point::new(1, 3),
    ///     Point::new(2, 4),
    ///     Point::new(3, 1),
    ///     Point::new(4, 2),
    /// ];
    /// expect_points.sort();
    /// assert_eq!(legal_points, expect_points);
    ///
    /// // 8×8の初期盤面
    /// // 黒視点
    /// board = Board::initialize(BoardSize::Size8);
    /// legal_points = board.get_legal_points(Disc::Black);
    /// legal_points.sort();
    /// let mut expect_points = vec![
    ///     Point::new(2, 3),
    ///     Point::new(3, 2),
    ///     Point::new(4, 5),
    ///     Point::new(5, 4),
    /// ];
    /// expect_points.sort();
    /// assert_eq!(legal_points, expect_points);
    ///
    /// // 白視点
    /// legal_points = board.get_legal_points(Disc::White);
    /// legal_points.sort();
    /// expect_points = vec![
    ///     Point::new(2, 4),
    ///     Point::new(3, 5),
    ///     Point::new(4, 2),
    ///     Point::new(5, 3),
    /// ];
    /// expect_points.sort();
    /// assert_eq!(legal_points, expect_points);
    /// ```
    pub fn get_legal_points(&self, disc: Disc) -> Vec<Point> {
        let hands = self.get_legal_hands(disc);
        Point::from_some_bit(hands, self.size)
    }

    /// 合法手があるか判定する
    ///
    /// # Arguments
    ///
    /// * `disc` - 自分の石の色
    ///
    /// # Returns
    ///
    /// * `bool` - `true`は合法手があり、`false`は合法手なし
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Board, BoardSize, Disc};
    ///
    /// // 初期盤面はどちらも合法手あり
    /// let mut board = Board::initialize(BoardSize::Size8);
    /// assert!(board.has_legal_hands(Disc::Black));
    /// assert!(board.has_legal_hands(Disc::White));
    ///
    /// // 全てのマスに石が置かれている状態
    /// board = Board::new(BoardSize::Size8, u64::MAX, 0);
    /// assert!(!board.has_legal_hands(Disc::Black));
    /// assert!(!board.has_legal_hands(Disc::White));
    /// ```
    pub fn has_legal_hands(&self, disc: Disc) -> bool {
        self.get_legal_hands(disc) != 0
    }

    /// 石を置く
    ///
    /// # Arguments
    ///
    /// * `point` - 石を置く座標
    /// * `disc` - 置く石の色
    ///
    /// # Returns
    ///
    /// * `bool` - `true`は置けた、`false`は置けなかった
    ///
    /// # Examples
    ///
    /// ```rust
    /// use reversi::{Board, BoardSize, Disc, Point};
    ///
    /// // 黒石
    /// let mut board = Board::initialize(BoardSize::Size8);
    /// let mut result = board.put_disc(Point::new(2, 3), Disc::Black);
    /// assert!(result);
    /// assert_eq!(board.n_black(), 4);
    /// assert_eq!(board.n_white(), 1);
    /// assert_eq!(board.get_disc(Point::new(2, 3)), Some(Disc::Black));
    /// assert_eq!(board.get_disc(Point::new(3, 3)), Some(Disc::Black));
    /// assert_eq!(board.get_disc(Point::new(4, 3)), Some(Disc::Black));
    /// assert_eq!(board.get_disc(Point::new(3, 4)), Some(Disc::Black));
    /// assert_eq!(board.get_disc(Point::new(4, 4)), Some(Disc::White));
    ///
    /// // 白石
    /// result = board.put_disc(Point::new(4, 2), Disc::White);
    /// assert!(result);
    ///
    /// // 範囲外
    /// board = Board::initialize(BoardSize::Size4);
    /// result = board.put_disc(Point::new(5, 5), Disc::Black);
    /// assert!(!result);
    ///
    /// // 合法手ではない
    /// board = Board::initialize(BoardSize::Size4);
    /// result = board.put_disc(Point::new(0, 0), Disc::Black);
    /// assert!(!result);
    /// ```
    pub fn put_disc(&mut self, point: Point, disc: Disc) -> bool {
        // 範囲外
        if !point.is_valid(self.size) {
            return false;
        }

        // 合法手かどうかの判定
        let legal_hands = self.get_legal_hands(disc);
        let index = point.to_bit(self.size);
        if legal_hands & index == 0 {
            return false;
        }

        // 盤面の更新
        let (mut player, mut opposite) = match disc {
            Disc::Black => (self.black, self.white),
            Disc::White => (self.white, self.black),
        };
        let is_valid = self.get_valid_bit();

        // 反転分を計算
        let mut total_flipped = 0;
        let directions = self.get_shift_directions();
        for &(shift, edge_mask) in &directions {
            let flips = self.calc_direction_flips(index, opposite, shift, edge_mask);
            if flips == 0 {
                continue;
            }

            // flipsの先に自分の既存の石があるか
            let next_pos = if shift > 0 {
                flips << shift
            } else {
                flips >> (-shift)
            };
            if (next_pos & !edge_mask & player) != 0 {
                total_flipped |= flips;
            }
        }
        total_flipped &= is_valid;
        player |= index | total_flipped;
        opposite &= !total_flipped;

        match disc {
            Disc::Black => {
                self.black = player;
                self.white = opposite;
            }
            Disc::White => {
                self.white = player;
                self.black = opposite;
            }
        }

        true
    }
}
