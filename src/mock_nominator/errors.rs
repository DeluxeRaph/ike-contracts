#[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum RuntimeError {
    CallRuntimeFailed,
    Unauthorized,
    Active,
    InvalidPoolState,
    Initialized,
    NotInitialized,
}
